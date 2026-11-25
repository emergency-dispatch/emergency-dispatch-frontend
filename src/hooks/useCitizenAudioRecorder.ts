import { useCallback, useEffect, useRef, useState } from 'react';

export const MAX_AUDIO_DURATION_SEC = 30;
export const MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 4000;

const SUPPORTED_AUDIO_MIMES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const;

function pickBestAudioMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  return SUPPORTED_AUDIO_MIMES.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
}

function extForMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes('mp4') || lower.includes('m4a')) return 'm4a';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  return 'webm';
}

function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export interface UseCitizenAudioRecorderOptions {
  language?: string;
}

/**
 * §55: Thu âm audio-only tối đa 30 giây (<= 5 MiB) kèm Speech-to-Text trực tiếp trên trình duyệt.
 * Luôn dọn sạch tracks, MediaRecorder, SpeechRecognition và ObjectURL khi dừng hoặc đóng modal.
 */
export function useCitizenAudioRecorder(options?: UseCitizenAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [transcript, setTranscriptState] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState('');

  const sttSupported = Boolean(getSpeechRecognitionCtor());

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const previewUrlRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false);
  const interimRef = useRef<string>('');

  const stopTimers = () => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  };

  const flushInterim = (commit: boolean) => {
    const pendingInterim = interimRef.current.trim();
    interimRef.current = '';
    setInterimTranscript('');
    if (commit && pendingInterim) {
      setTranscriptState((prev) =>
        `${prev ? prev.trimEnd() + ' ' : ''}${pendingInterim}`.slice(0, MAX_TRANSCRIPT_LENGTH)
      );
    }
  };

  const stopRecognition = (commitInterim = true) => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // ignore
      }
    }
    flushInterim(commitInterim);
  };

  const stopAudioTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  };

  const setTranscript = useCallback((value: string) => {
    setTranscriptState(value.slice(0, MAX_TRANSCRIPT_LENGTH));
  }, []);

  const stopRecording = useCallback(() => {
    stopTimers();
    stopRecognition(true);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      isStoppingRef.current = true;
      try {
        rec.stop();
      } catch {
        stopAudioTracks();
        setIsRecording(false);
        isStoppingRef.current = false;
      }
    } else {
      stopAudioTracks();
      setIsRecording(false);
    }
  }, []);

  const clearRecording = useCallback(() => {
    interimRef.current = '';
    stopRecording();
    revokePreview();
    setAudioFile(null);
    setDurationSeconds(0);
    setRecordingSeconds(0);
    setTranscriptState('');
    setInterimTranscript('');
    setMicError('');
    chunksRef.current = [];
  }, [stopRecording]);

  const startRecording = useCallback(
    async (opts?: { resetTranscript?: boolean }) => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') return true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        setMicError('Trình duyệt không hỗ trợ ghi âm trực tiếp.');
        return false;
      }

      setMicError('');
      revokePreview();
      setAudioFile(null);
      setDurationSeconds(0);
      setRecordingSeconds(0);
      if (opts?.resetTranscript) {
        setTranscriptState('');
      }
      interimRef.current = '';
      setInterimTranscript('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        const mime = pickBestAudioMime();
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        isStoppingRef.current = false;
        startedAtRef.current = Date.now();

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          stopTimers();
          stopRecognition();
          stopAudioTracks();
          recorderRef.current = null;
          isStoppingRef.current = false;
          setIsRecording(false);

          const elapsedSec = Math.max(1, Math.min(MAX_AUDIO_DURATION_SEC, Math.round((Date.now() - startedAtRef.current) / 1000)));
          const actualMime = (recorder.mimeType || mime || 'audio/webm').trim();
          const blob = new Blob(chunksRef.current, { type: actualMime });
          chunksRef.current = [];

          if (blob.size === 0) return;
          if (blob.size > MAX_AUDIO_SIZE_BYTES) {
            setMicError('Bản ghi âm vượt quá giới hạn 5 MiB. Vui lòng thu lại ngắn hơn.');
            return;
          }

          const ext = extForMime(actualMime);
          const cleanMime = actualMime.split(';')[0].trim() || 'audio/webm';
          const file = new File([blob], `sos-voice-${Date.now()}.${ext}`, { type: cleanMime });
          const objectUrl = URL.createObjectURL(blob);
          previewUrlRef.current = objectUrl;
          setAudioFile(file);
          setLocalPreviewUrl(objectUrl);
          setDurationSeconds(elapsedSec);
        };

        recorder.start(250);
        setIsRecording(true);

        // Bắt đầu STT nếu trình duyệt hỗ trợ (fallback êm ái nếu không có)
        const SpeechRec = getSpeechRecognitionCtor();
        if (SpeechRec) {
          try {
            const stt = new SpeechRec();
            stt.lang = options?.language?.startsWith('en') ? 'en-US' : 'vi-VN';
            stt.continuous = true;
            stt.interimResults = true;
            stt.onresult = (event: any) => {
              let finalChunk = '';
              let interimChunk = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0]?.transcript || '';
                if (res.isFinal) {
                  finalChunk += text + ' ';
                } else {
                  interimChunk += text;
                }
              }
              if (finalChunk.trim()) {
                setTranscriptState((prev) =>
                  `${prev ? prev.trimEnd() + ' ' : ''}${finalChunk.trim()}`.slice(0, MAX_TRANSCRIPT_LENGTH)
                );
              }
              const nextInterim = interimChunk.trim();
              interimRef.current = nextInterim;
              setInterimTranscript(nextInterim);
            };
            const onRecognitionStop = () => flushInterim(true);
            stt.onerror = onRecognitionStop;
            stt.onend = onRecognitionStop;
            recognitionRef.current = stt;
            stt.start();
          } catch {
            // Browser denied or unsupported runtime STT: keep audio recording alive
          }
        }

        tickTimerRef.current = setInterval(() => {
          const sec = Math.min(MAX_AUDIO_DURATION_SEC, Math.floor((Date.now() - startedAtRef.current) / 1000));
          setRecordingSeconds(sec);
        }, 250);

        // Dừng trước mốc 30s một chút (29.5s) để BE Cloudinary không reject >30s
        autoStopTimerRef.current = setTimeout(() => {
          stopRecording();
        }, 29500);

        return true;
      } catch (err: any) {
        stopAudioTracks();
        setIsRecording(false);
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setMicError('Micro chưa được cấp quyền. Bạn vẫn có thể chụp ảnh và nhập ghi chú.');
        } else {
          setMicError('Không thể bật micro lúc này. Bạn vẫn có thể gửi ảnh/ghi chú.');
        }
        return false;
      }
    },
    [options?.language, stopRecording]
  );

  useEffect(() => {
    return () => {
      stopTimers();
      stopRecognition(false);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.ondataavailable = null;
          rec.onstop = null;
          rec.stop();
        } catch {
          // ignore
        }
      }
      stopAudioTracks();
      revokePreview();
    };
  }, []);

  return {
    isRecording,
    recordingSeconds,
    durationSeconds,
    audioFile,
    localPreviewUrl,
    transcript,
    interimTranscript,
    setTranscript,
    sttSupported,
    micError,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
