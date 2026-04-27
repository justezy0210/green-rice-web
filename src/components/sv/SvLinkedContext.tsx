import { CandidateBlocksInAnalysesPanel } from '@/components/entity/CandidateBlocksInAnalysesPanel';

interface Props {
  eventId: string;
}

export function SvLinkedContext({ eventId }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <CandidateBlocksInAnalysesPanel entityType="sv" entityId={eventId} />
    </div>
  );
}
