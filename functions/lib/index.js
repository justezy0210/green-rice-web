"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCultivarGenomeUpdate = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const options_1 = require("firebase-functions/v2/options");
const parse_orchestrator_1 = require("./parsers/parse-orchestrator");
admin.initializeApp();
(0, options_1.setGlobalOptions)({
    region: 'asia-northeast3',
    memory: '1GiB',
    timeoutSeconds: 540,
});
exports.onCultivarGenomeUpdate = (0, firestore_1.onDocumentWritten)('cultivars/{cultivarId}', async (event) => {
    const after = event.data?.after?.data();
    if (!after)
        return;
    const summary = after.genomeSummary;
    if (!summary)
        return;
    // Only trigger when status is 'pending'
    if (summary.status !== 'pending')
        return;
    // Check all 3 files are uploaded
    const { genomeFasta, geneGff3, repeatGff } = summary.files;
    if (!genomeFasta?.uploaded || !geneGff3?.uploaded || !repeatGff?.uploaded)
        return;
    const cultivarId = event.params.cultivarId;
    const docRef = admin.firestore().collection('cultivars').doc(cultivarId);
    // Transition to 'processing' with a transaction to prevent duplicate runs
    const shouldProceed = await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const current = snap.data()?.genomeSummary;
        if (!current || current.status !== 'pending')
            return false;
        tx.update(docRef, {
            'genomeSummary.status': 'processing',
            'genomeSummary.updatedAt': new Date().toISOString(),
        });
        return true;
    });
    if (!shouldProceed)
        return;
    try {
        const result = await (0, parse_orchestrator_1.parseGenomeFiles)(cultivarId, summary.files);
        await docRef.update({
            'genomeSummary.status': 'complete',
            'genomeSummary.assembly': result.assembly,
            'genomeSummary.geneAnnotation': result.geneAnnotation,
            'genomeSummary.repeatAnnotation': result.repeatAnnotation,
            'genomeSummary.errorMessage': admin.firestore.FieldValue.delete(),
            'genomeSummary.updatedAt': new Date().toISOString(),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown parsing error';
        await docRef.update({
            'genomeSummary.status': 'error',
            'genomeSummary.errorMessage': message,
            'genomeSummary.updatedAt': new Date().toISOString(),
        });
    }
});
//# sourceMappingURL=index.js.map