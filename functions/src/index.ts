import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { parseGenomeFiles } from './parsers/parse-orchestrator';
import type { GenomeSummary } from './types/genome-summary';

admin.initializeApp();

setGlobalOptions({
  region: 'asia-northeast3',
  memory: '1GiB',
  timeoutSeconds: 540,
});

export const onCultivarGenomeUpdate = onDocumentWritten(
  'cultivars/{cultivarId}',
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return;

    const summary = after.genomeSummary as GenomeSummary | undefined;
    if (!summary) return;

    // Only trigger when status is 'pending'
    if (summary.status !== 'pending') return;

    // Check all 3 files are uploaded
    const { genomeFasta, geneGff3, repeatGff } = summary.files;
    if (!genomeFasta?.uploaded || !geneGff3?.uploaded || !repeatGff?.uploaded) return;

    const cultivarId = event.params.cultivarId;
    const docRef = admin.firestore().collection('cultivars').doc(cultivarId);

    // Transition to 'processing' with a transaction to prevent duplicate runs
    const shouldProceed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const current = snap.data()?.genomeSummary as GenomeSummary | undefined;
      if (!current || current.status !== 'pending') return false;

      tx.update(docRef, {
        'genomeSummary.status': 'processing',
        'genomeSummary.updatedAt': new Date().toISOString(),
      });
      return true;
    });

    if (!shouldProceed) return;

    try {
      const result = await parseGenomeFiles(cultivarId, summary.files);

      await docRef.update({
        'genomeSummary.status': 'complete',
        'genomeSummary.assembly': result.assembly,
        'genomeSummary.geneAnnotation': result.geneAnnotation,
        'genomeSummary.repeatAnnotation': result.repeatAnnotation,
        'genomeSummary.errorMessage': admin.firestore.FieldValue.delete(),
        'genomeSummary.updatedAt': new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown parsing error';
      await docRef.update({
        'genomeSummary.status': 'error',
        'genomeSummary.errorMessage': message,
        'genomeSummary.updatedAt': new Date().toISOString(),
      });
    }
  },
);
