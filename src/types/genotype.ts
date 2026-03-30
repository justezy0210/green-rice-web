// Placeholder types for future genotype data integration

export interface GenotypeRecord {
  cultivar: string;
  snpData?: SNPVariant[];
  markerData?: MarkerInfo[];
  geneAnnotations?: GeneAnnotation[];
}

export interface SNPVariant {
  chromosome: string;
  position: number;
  refAllele: string;
  altAllele: string;
  genotype: string;
}

export interface MarkerInfo {
  markerId: string;
  chromosome: string;
  position: number;
  allele: string;
}

export interface GeneAnnotation {
  geneId: string;
  geneName: string;
  chromosome: string;
  startPos: number;
  endPos: number;
  annotation: string;
}
