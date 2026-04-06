import { statusLabel, statusTone } from "../utils/format";

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  );
}
