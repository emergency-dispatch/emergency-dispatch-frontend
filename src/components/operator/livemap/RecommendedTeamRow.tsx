import React from 'react';
import { HandHelping } from 'lucide-react';
import { GpsFarNote } from './GpsFarNote';
import { RecommendedTeamLabel } from '../teams/RecommendedTeamLabel';
import { useTeamByVehicle } from '../../../hooks/useStationTeams';
import { useTranslation } from '../../../i18n';
import type { DispatchAlgorithm, DispatchCandidate, DispatchTeamCandidate } from '../../../types/vehicle';

interface RecommendedTeamRowProps {
  team: DispatchTeamCandidate;
  /** Chức năng tổ sẽ đảm nhận trong nhóm đang hiện. */
  option: DispatchCandidate;
  algorithm: DispatchAlgorithm;
  /** Nhóm đã ghi chức năng → không lặp nhãn trên từng tổ. */
  hideFunction?: boolean;
  picked?: boolean;
  /** Ô chọn (giao nhiều tổ) đứng trước tên tổ. */
  leading?: React.ReactNode;
  /** Nút riêng của dòng — bấm nút không tính là bấm thẻ. */
  action: React.ReactNode;
  /** Bấm bất kỳ đâu trên thẻ = chọn / bỏ chọn tổ (bàn phím dùng ô chọn). Không truyền thì thẻ không bấm được. */
  onToggle?: () => void;
}

/** Một dòng tổ trong nhóm chức năng của Chi tiết ca: mỗi dòng cố định một chức năng. */
export const RecommendedTeamRow: React.FC<RecommendedTeamRowProps> = ({
  team,
  option,
  algorithm,
  hideFunction = false,
  picked = false,
  leading,
  action,
  onToggle,
}) => {
  const { t } = useTranslation();
  const leader = useTeamByVehicle().get(option.vehicleId)?.members.find((m) => m.crewRole === 'commander');

  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-2 border rounded-lg px-2.5 py-2 transition-colors ${
        picked ? 'border-red-300 bg-red-50/60' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'
      } ${onToggle ? 'cursor-pointer' : ''}`}
      title={
        algorithm === 'load_aware'
          ? t('liveMap.recommend.costTitle', { load: Math.round(option.stationLoad * 100) })
          : undefined
      }
    >
      {leading && (
        <span className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
          {leading}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {team.isSupportUnit && (
          <span className="inline-flex items-center gap-0.5 mb-0.5 px-1.5 py-px rounded bg-blue-50 border border-blue-200 text-[9px] font-bold text-blue-700">
            <HandHelping className="w-2.5 h-2.5" />
            {t('liveMap.recommend.supportUnit', { station: team.stationName })}
          </span>
        )}
        <RecommendedTeamLabel
          team={{ ...team, options: [option] }}
          selected={option}
          hideFunction={hideFunction}
          onSelectOption={() => undefined}
          leaderName={leader?.fullName}
          detail={
            <>
              {t('liveMap.recommend.distance', { km: option.km.toFixed(1) })}
              {option.isApproximate && t('liveMap.recommend.approximate')}
              {t('liveMap.recommend.etaShort', { count: option.etaMinutes })}
              {algorithm === 'load_aware' && ` · ${option.cost.toFixed(2)}`}
            </>
          }
        />
        <GpsFarNote option={option} />
      </div>
      <span className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
        {action}
      </span>
    </div>
  );
};
