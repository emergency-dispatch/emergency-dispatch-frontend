import React, { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '../../config/api';

interface GoogleButtonProps {
  text?: string;
  onSuccess?: (credential: string) => void;
  onError?: (error: string) => void;
  onClickFallback?: () => void;
  onClick?: () => void;
  isLoading?: boolean;
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  text = 'Đăng nhập với Google',
  onSuccess,
  onError,
  onClickFallback,
  onClick,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gisRendered, setGisRendered] = useState(false);

  useEffect(() => {
    if (!onSuccess) return;

    let intervalId: ReturnType<typeof setInterval>;
    let attempts = 0;

    const renderGoogleBtn = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      const clientId = API_CONFIG.GOOGLE_CLIENT_ID;

      if (google?.accounts?.id && clientId && containerRef.current) {
        try {
          google.accounts.id.initialize({
            client_id: clientId,
            auto_select: false,
            callback: (response: { credential?: string }) => {
              if (response?.credential) {
                onSuccess(response.credential);
              } else if (onError) {
                onError('Không nhận được mã xác thực từ Google.');
              }
            },
          });

          // Prevent Google from auto-selecting or caching previous user session on this origin
          try {
            google.accounts.id.disableAutoSelect();
          } catch {
            // Ignore if not supported in some contexts
          }

          containerRef.current.innerHTML = '';
          google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: 380,
          });

          setGisRendered(true);
          clearInterval(intervalId);
        } catch {
          // Keep custom button as fallback
        }
      }
    };

    renderGoogleBtn();

    if (!gisRendered) {
      intervalId = setInterval(() => {
        attempts++;
        renderGoogleBtn();
        if (attempts > 15) {
          clearInterval(intervalId);
        }
      }, 300);
    }

    return () => clearInterval(intervalId);
  }, [onSuccess, onError, gisRendered]);

  const handleButtonClick = () => {
    if (isLoading) return;
    if (onClick) {
      onClick();
    } else if (onClickFallback) {
      onClickFallback();
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl group">
      {/* 
        Tactical CAD Google Button:
        Always renders sleek CAD design matching the emergency dispatch theme.
        Never displays raw Google white cards or personal user badges on the landing page.
      */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-slate-900/90 group-hover:bg-slate-800 text-slate-100 font-semibold text-sm border border-slate-700/80 group-hover:border-slate-500 group-hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 relative overflow-hidden active:scale-[0.99] disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-300 font-mono-data text-xs">Đang xác thực Google...</span>
          </div>
        ) : (
          <>
            {/* Official Google 'G' Multi-colored SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="whitespace-nowrap tracking-wide">{text}</span>
          </>
        )}
      </button>

      {/* 
        Invisible Official Google GIS button overlay:
        When rendered, overlays the CAD button with opacity 0.001.
        Clicking on the CAD button securely triggers the official Google GIS popup flow.
      */}
      {onSuccess && (
        <div
          ref={containerRef}
          className={`absolute inset-0 z-10 flex items-center justify-center cursor-pointer overflow-hidden ${
            isLoading || !gisRendered ? 'pointer-events-none' : ''
          }`}
          style={{
            opacity: 0.001,
            transform: 'scale(1.25)',
            transformOrigin: 'center center',
          }}
          title={text}
        />
      )}
    </div>
  );
};
