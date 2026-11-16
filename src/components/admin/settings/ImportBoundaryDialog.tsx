import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { ConfirmModal } from '../common/ui';
import { inputClass } from '../common/styles';
import { boundaryVertexCount, parseGeoJsonInput, simplifyBoundary, type PolygonCoords } from './serviceAreaBoundary';
import { useTranslation } from '../../../i18n';

/** Đa giác nhập vào bị rút gọn còn tối đa bấy nhiêu đỉnh để vẽ / kéo đỉnh không nặng. */
const MAX_IMPORT_VERTICES = 80;

interface ImportBoundaryDialogProps {
  onCancel: () => void;
  /** `originalVertices` = số đỉnh trước khi rút gọn (để báo cho Admin). */
  onImport: (polygons: PolygonCoords[], originalVertices: number) => void;
}

/**
 * §33: nhập ranh giới khu vực phục vụ từ GeoJSON (dán chuỗi hoặc chọn file .geojson / .json — VD xuất từ OpenStreetMap,
 * geojson.io). Nhận Polygon / MultiPolygon / Feature / FeatureCollection; đa giác nhiều đỉnh được rút gọn trước khi
 * đưa lên bản đồ để Admin chỉnh tiếp như đa giác vẽ tay.
 */
export const ImportBoundaryDialog: React.FC<ImportBoundaryDialogProps> = ({ onCancel, onImport }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setText(await file.text());
    } catch {
      setError(t('admin.settings.serviceArea.import.readFailed'));
    }
  };

  const handleImport = () => {
    let polygons: PolygonCoords[];
    try {
      polygons = parseGeoJsonInput(text);
    } catch {
      setError(t('admin.settings.serviceArea.import.invalidJson'));
      return;
    }
    if (polygons.length === 0) {
      setError(t('admin.settings.serviceArea.import.noPolygon'));
      return;
    }
    onImport(simplifyBoundary(polygons, MAX_IMPORT_VERTICES), boundaryVertexCount(polygons));
  };

  return (
    <ConfirmModal
      title={t('admin.settings.serviceArea.import.title')}
      confirmLabel={t('admin.settings.serviceArea.import.confirm')}
      confirmDisabled={!text.trim()}
      onCancel={onCancel}
      onConfirm={handleImport}
    >
      <p className="text-xs">{t('admin.settings.serviceArea.import.hint', { max: MAX_IMPORT_VERTICES })}</p>
      <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-red-400 hover:text-red-600 cursor-pointer">
        <FileUp className="w-4 h-4" />
        {t('admin.settings.serviceArea.import.chooseFile')}
        <input
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="sr-only"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        rows={7}
        spellCheck={false}
        placeholder={t('admin.settings.serviceArea.import.placeholder')}
        aria-label={t('admin.settings.serviceArea.import.title')}
        className={`${inputClass} font-mono-data text-[11px] resize-y`}
      />
      {error && (
        <p role="alert" className="text-[11px] font-medium text-red-600">
          {error}
        </p>
      )}
    </ConfirmModal>
  );
};
