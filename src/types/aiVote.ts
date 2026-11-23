import type { SeverityLevel } from './incident';

/**
 * §42 — mirror AiModelVoteDto: phiếu của một model trong chế độ "3 AI bỏ phiếu". Phần tử đầu luôn là TriageVL-3B
 * (chỉ bỏ phiếu khi nó đã đạt ngưỡng).
 */
export interface AiModelVoteDto {
  model: string;
  /** null = model không trả lời được. */
  incidentType: 'fire' | 'accident' | 'none' | null;
  /** 0 = không có sự cố, 1–3 = cấp. */
  severity: number;
  /** 0–1. */
  confidence: number | null;
  confidenceSource: string | null;
  isAvailable: boolean;
  /** Cùng loại sự cố với TriageVL và đạt ngưỡng. */
  inMajority: boolean;
  error: string | null;
}

/** Ca không có ảnh thì backend chỉ trả phiếu TriageVL → vẫn tính trên 3 model. */
const ENSEMBLE_SIZE = 3;

/** "ResNet-50 (7 levels)" → "ResNet-50". */
export const aiVoteModelName = (model: string) => model.replace(/\s*\(7 levels\)$/i, '');

/** Một chữ số thập phân: 89,9% dưới ngưỡng 90% không bị làm tròn thành 90%. */
export const aiVotePercent = (confidence: number) => Math.round(confidence * 1000) / 10;

export const aiVoteTally = (votes: AiModelVoteDto[]) => ({
  agree: votes.filter((v) => v.inMajority).length,
  total: Math.max(ENSEMBLE_SIZE, votes.length),
});

/** Cấp TriageVL → cấp cao nhất trong nhóm đồng ý (backend nâng cấp sự cố theo mức này). null = không nâng. */
export function aiVoteUpgrade(votes: AiModelVoteDto[]): { from: SeverityLevel; to: SeverityLevel } | null {
  const isLevel = (n: number): n is SeverityLevel => n === 1 || n === 2 || n === 3;
  const from = votes[0]?.severity ?? 0;
  const to = Math.max(0, ...votes.filter((v) => v.inMajority).map((v) => v.severity));
  return isLevel(from) && isLevel(to) && to > from ? { from, to } : null;
}

export type AiVoteStatus = 'reference' | 'agree' | 'belowThreshold' | 'differentType' | 'unavailable';

/** Vì sao phiếu được / không được tính. Phiếu đầu (TriageVL) là chuẩn để so, không phải "đồng ý". */
export function aiVoteStatus(vote: AiModelVoteDto, index: number, votes: AiModelVoteDto[]): AiVoteStatus {
  if (index === 0) return 'reference';
  if (!vote.isAvailable) return 'unavailable';
  if (vote.inMajority) return 'agree';
  return vote.incidentType === votes[0].incidentType ? 'belowThreshold' : 'differentType';
}
