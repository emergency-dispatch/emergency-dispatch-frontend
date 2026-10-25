import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  User,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INCIDENT_CATEGORY_META, SEVERITY_LEVEL_META } from '../../data/incidentMock';
import { useDispatchStore } from '../../context/DispatchContext';
import type { Incident } from '../../types/incident';
import { useTranslation } from '../../i18n';

const QUEUE_PATH = '/dashboard/command-center/incidents';

interface ModalProps {
  incident: Incident;
  onDismiss: () => void;
  onGoToQueue: () => void;
}

const IncidentModal: React.FC<ModalProps> = ({ incident, onDismiss, onGoToQueue }) => {
  const { t } = useTranslation();
  const now = Date.now();
  const minutes = Math.max(0, Math.floor((now - new Date(incident.createdAt).getTime()) / 60000));
  const category = INCIDENT_CATEGORY_META[incident.category];
  const CategoryIcon = category.icon;
  const severityMeta = SEVERITY_LEVEL_META[incident.severity];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div className="relative w-full max-w-lg bg-white border-2 border-red-600 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">

        {/* Header đỏ */}
        <div className="relative bg-red-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BellRing className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-mono-data uppercase tracking-widest text-red-100 font-bold">
                {t('layout.incomingIncident.kicker')}
              </div>
              <h2 className="text-base font-black text-white leading-tight">{t('layout.incomingIncident.title')}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-all"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">

          {/* Mức độ + loại */}
          <div className="flex items-center flex-wrap gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold flex items-center gap-1.5 border ${severityMeta.badgeClass}`}
            >
              {t(`enums.severity.level${incident.severity}`)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: category.color }}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {t(`enums.category.${incident.category}`)}
            </span>
            {incident.aiPending && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('layout.incomingIncident.aiAnalyzing')}
              </span>
            )}
          </div>

          {/* Tiêu đề + mô tả */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">{incident.title}</h3>
            {incident.description && (
              <p className="text-xs text-slate-600 leading-relaxed">{incident.description}</p>
            )}
          </div>

          {/* Thông tin địa điểm + thời gian */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-data uppercase font-bold text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                {t('layout.incomingIncident.location')}
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-snug">{incident.area}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono-data uppercase font-bold text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {t('layout.incomingIncident.waitTime')}
              </div>
              <p className="text-sm font-black text-slate-900 font-mono-data">
                {minutes === 0 ? t('layout.incomingIncident.justNow') : t('layout.incomingIncident.minutes', { count: minutes })}
              </p>
            </div>
          </div>

          {/* Người báo */}
          {(incident.reporterName || incident.reporterPhone) && (
            <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              {incident.reporterName && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-600">{t('layout.incomingIncident.reporter')} <strong className="text-slate-900">{incident.reporterName}</strong></span>
                </div>
              )}
              {incident.reporterPhone && incident.reporterPhone !== '—' && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-red-600" />
                  <a href={`tel:${incident.reporterPhone}`} className="text-red-600 font-mono-data font-bold hover:underline">
                    {incident.reporterPhone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <X className="w-4 h-4 text-slate-400" />
            {t('layout.incomingIncident.skip')}
          </button>
          <button
            onClick={onGoToQueue}
            className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5 animate-pulse" />
            {t('layout.incomingIncident.verifyNow')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Hiển thị popup giữa màn hình khi có tin báo mới từ người dân.
 * Hiện từng tin báo một (FIFO), dismiss thì chuyển sang tin tiếp theo.
 */
export const IncomingIncidentToasts: React.FC = () => {
  const { incomingIncidents, dismissIncomingIncident } = useDispatchStore();
  const navigate = useNavigate();

  // Chỉ hiện tin báo đầu tiên trong queue; dismiss → tin tiếp theo tự lên
  const current = incomingIncidents[0] ?? null;

  if (!current) return null;

  const handleDismiss = () => dismissIncomingIncident(current.id);

  const handleGoToQueue = () => {
    dismissIncomingIncident(current.id);
    navigate(QUEUE_PATH, { state: { openIncidentId: current.id } });
  };

  return (
    <IncidentModal
      key={current.id}
      incident={current}
      onDismiss={handleDismiss}
      onGoToQueue={handleGoToQueue}
    />
  );
};
