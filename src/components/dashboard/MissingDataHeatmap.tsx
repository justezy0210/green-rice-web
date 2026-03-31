import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhenotypeRecord } from "@/types/phenotype";
import { PHENOTYPE_FIELDS, getNumericValue } from "@/lib/utils";

interface MissingDataHeatmapProps {
  records: PhenotypeRecord[];
}

const HEADING_KEYS = ["early", "normal", "late"];
const BLB_KEY = "bacterialLeafBlight";

const COLUMNS: { key: string; label: string; keys: string[] }[] = [
  { key: "__heading__", label: "Days to Heading", keys: HEADING_KEYS },
  ...PHENOTYPE_FIELDS.filter((f) => f.category !== "heading").map((f) => ({
    key: f.key,
    label: f.label,
    keys: [f.key],
  })),
];

function blbStatus(record: PhenotypeRecord): "all" | "partial" | "none" | "missing" {
  const d = record.bacterialLeafBlightDetail;
  if (!d) return "missing";
  const values = [d.k1, d.k2, d.k3, d.k3a];
  if (values.every((v) => v === null)) return "missing";
  const count = values.filter(Boolean).length;
  if (count === 4) return "all";
  if (count > 0) return "partial";
  return "none";
}

export function MissingDataHeatmap({ records }: MissingDataHeatmapProps) {
  const navigate = useNavigate();
  const displayed = records.slice(0, 30);

  function hasValue(record: PhenotypeRecord, keys: string[]): boolean {
    return keys.some((k) => getNumericValue(record, k) !== null);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Missing Data</CardTitle>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Missing
          </span>
        </div>
        <table className="text-xs border-collapse">
          <tbody>
            {displayed.map((record) => (
              <tr key={record.cultivar} className="hover:bg-gray-50">
                <td
                  className="sticky left-0 bg-white pr-4 py-0.5 text-gray-700 font-medium whitespace-nowrap hover:text-green-600 cursor-pointer"
                  onClick={() => navigate(`/cultivar/${encodeURIComponent(record.cultivar)}`)}
                >
                  {record.cultivar}
                </td>
                {COLUMNS.map((col) => {
                  if (col.key === BLB_KEY) {
                    const status = blbStatus(record);
                    const colorClass =
                      status === "all" ? "bg-green-400" :
                      status === "partial" ? "bg-amber-300" :
                      status === "none" ? "bg-red-200" :
                      "bg-gray-200";
                    const title =
                      status === "all" ? "All resistant (4/4)" :
                      status === "partial" ? "Partial resistance" :
                      status === "none" ? "No resistance (0/4)" :
                      "Missing";
                    return (
                      <td key={col.key} className="px-1 py-0.5 text-center">
                        <div className={`w-5 h-5 rounded-sm mx-auto ${colorClass}`} title={title} />
                      </td>
                    );
                  }
                  const present = hasValue(record, col.keys);
                  return (
                    <td key={col.key} className="px-1 py-0.5 text-center">
                      <div
                        className={`w-5 h-5 rounded-sm mx-auto ${present ? "bg-green-400" : "bg-red-200"}`}
                        title={present ? "Present" : "Missing"}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="sticky left-0 bg-white pr-4 min-w-28" />
              {COLUMNS.map((col) => (
                <td key={col.key} className="px-1 pt-2 text-center align-top">
                  <div
                    className="whitespace-nowrap text-gray-500 font-normal"
                    style={{ writingMode: "vertical-rl", height: "72px", textAlign: "start" }}
                  >
                    {col.label}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}
