import {
  Dna,
  Map,
  Network,
  Search,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

export type GuideStep = {
  label: string;
  detail: string;
  inspect: string;
  result: string;
};

export type GuideScenario = {
  id: string;
  title: string;
  tabLabel: string;
  question: string;
  summary: string;
  steps: GuideStep[];
  notice: string[];
  outcome: string;
  icon: LucideIcon;
};

export const GUIDE_SCENARIOS: GuideScenario[] = [
  {
    id: 'overview-pangenome',
    title: 'Panel overview before choosing a candidate',
    tabLabel: 'Overview',
    question: 'What is the scale of this pangenome before I inspect one gene, SV, or locus?',
    summary:
      'Start here when you want to understand the database frame: panel coverage, orthogroup conservation, functional categories, and SV release scope.',
    steps: [
      {
        label: 'Open Browse, then choose Pangenome',
        detail: 'Use the Pangenome Summary page as the orientation layer before drilling into one entity.',
        inspect: 'Check panel cultivars, graph coverage, total orthogroups, and SV event count.',
        result: 'You know the database scale and what part of the panel currently has SV coverage.',
      },
      {
        label: 'Read Orthogroup Conservation',
        detail: 'Compare core, variable, rare, private, and panel-absent orthogroup tiers.',
        inspect: 'Look at which conservation tiers are large enough to drive follow-up questions.',
        result: 'You understand how the gene family catalog is divided into core and accessory-like patterns.',
      },
      {
        label: 'Check Functional Pangenome and SV Release',
        detail: 'Use the functional category summary and SV type counts to decide where to browse next.',
        inspect: 'Look for functional categories or SV types that match the biological question.',
        result: 'You can choose whether to continue into Orthogroups, Genes, or Structural variants.',
      },
    ],
    notice: [
      'This page is not a candidate-discovery result; it is the panel-level catalog overview.',
      'Counts are panel-scoped and should not be interpreted as Korean-rice-wide frequencies.',
    ],
    outcome: 'The user gets a map of the database before starting a detailed candidate review.',
    icon: Network,
  },
  {
    id: 'cultivar-region',
    title: 'Late-heading cultivar to chr06 genome context',
    tabLabel: 'Cultivar',
    question: 'If Samgwang is a late-heading cultivar, what does its chr06 heading-date region look like?',
    summary:
      'This case starts from a real cultivar, checks its phenotype context, then moves into an assembly-level region that is relevant to heading-date review.',
    steps: [
      {
        label: 'Open Browse, choose Cultivars, then click Samgwang',
        detail: 'Start with the cultivar page before looking at any gene or SV.',
        inspect: 'Check the phenotype profile and confirm that Samgwang belongs to the late-heading side of the panel.',
        result: 'You know the phenotype background of the cultivar before interpreting its genome track.',
      },
      {
        label: 'Scroll to Chromosomes and choose chr06',
        detail: 'Use the chromosome list to enter the genome view without needing an OG or SV ID.',
        inspect: 'Confirm that the database lets a cultivar-centered user move directly into assembly coordinates.',
        result: 'You move from a phenotype/cultivar question into a browsable genome region.',
      },
      {
        label: 'Inspect the region track near chr06:10.0-10.65 Mb',
        detail: 'Use the region track to view Samgwang gene models and cultivar-carried SVs around a heading-date candidate window.',
        inspect: 'Check whether nearby genes and SV marks occupy the same local interval.',
        result: 'You can see the local genome structure behind a late-heading cultivar example.',
      },
    ],
    notice: [
      'This case is designed for users who know a cultivar but do not know the database IDs.',
      'The region track gives context for inspection; it does not prove heading-date causality.',
    ],
    outcome: 'A cultivar-centered question becomes an assembly-level inspection of genes and SVs in a trait-relevant region.',
    icon: Sprout,
  },
  {
    id: 'function-og',
    title: 'Gene or function to phenotype-group copy pattern',
    tabLabel: 'Gene/OG',
    question: 'Can a gene or biological keyword reveal a gene family pattern across phenotype groups?',
    summary:
      'This case covers both user styles: starting from a known gene ID in Genes, or from a functional keyword in Orthogroups.',
    steps: [
      {
        label: 'If you know a gene ID, open Browse, choose Genes, and search it',
        detail: 'Use the Genes page when the question starts from one transcript or cultivar gene model.',
        inspect: 'Check the gene annotation, orthogroup assignment, trait-hit badges, and linked SV badge in the result row.',
        result: 'You connect a single gene to its broader OG, phenotype, and SV context.',
      },
      {
        label: 'Open Browse, choose Orthogroups, then search bacterial blight',
        detail: 'Use Orthogroups when the question starts from function rather than from one gene ID.',
        inspect: 'Look for orthogroups whose functional text mentions bacterial blight or resistance-like annotation.',
        result: 'You find candidate gene families from biological function text.',
      },
      {
        label: 'Select Bacterial Leaf Blight in Trait evidence, then open OG0000297',
        detail: 'Use the trait filter to keep only the function hits that also have phenotype-linked evidence.',
        inspect: 'In Orthogroup members, compare copy counts between resistant and susceptible cultivar badges.',
        result: 'You can see whether a resistance-like gene family has a group-level copy pattern.',
      },
      {
        label: 'Choose one member gene from a cultivar of interest',
        detail: 'Move from the group-level gene family pattern into a single cultivar gene model.',
        inspect: 'Check gene annotation, gene model structure, and nearby SV context around the selected member gene.',
        result: 'You can decide whether the OG-level resistance-like pattern deserves gene-level follow-up.',
      },
    ],
    notice: [
      'This is a good entry point for users who think in functions, not database identifiers.',
      'The pattern suggests a follow-up candidate; it is not validation of bacterial blight resistance.',
    ],
    outcome: 'A gene or function query becomes a reviewable orthogroup with phenotype-group copy-pattern evidence.',
    icon: Search,
  },
  {
    id: 'sv-carrier',
    title: 'Early-heading cultivars to a group-specific SV',
    tabLabel: 'SV',
    question: 'Can early-heading cultivars point to an SV carried by the whole early group and absent from late cultivars?',
    summary:
      'This case shows why the SV browser matters: the user can define a cultivar group and ask which structural variants match that group.',
    steps: [
      {
        label: 'Open Browse, choose Structural variants, then turn cultivar buttons on',
        detail: 'Select only the cultivars that represent the early-heading group.',
        inspect: 'For the heading-date example, select Baegilmi, Jopyeong, Jungmo1024, Namil, and Pyeongwon.',
        result: 'The SV table becomes a phenotype-group carrier screen.',
      },
      {
        label: 'Keep the mode set to Only selected',
        detail: 'Ask for SVs carried by every selected early-heading cultivar and absent from the unselected cultivars.',
        inspect: 'Watch how strict the result becomes as the selected cultivar set changes.',
        result: 'You separate strict group-specific SVs from variants that are broadly shared.',
      },
      {
        label: 'Type EV0007248 in the search box and open that row',
        detail: 'Use EV0007248 as the concrete heading-date SV example.',
        inspect: 'Check carrier cultivars, coordinate, SV type, and region context.',
        result: 'You learn whether the SV carrier pattern matches the early-versus-late phenotype contrast.',
      },
    ],
    notice: [
      'This case is useful because phenotype groups become an explicit SV query.',
      'SV carrier specificity is still a prioritization signal, not a marker-ready result.',
    ],
    outcome: 'A phenotype-group question becomes a focused SV carrier-pattern review.',
    icon: Dna,
  },
  {
    id: 'discovery-block',
    title: 'Culm-length split at a chr11 review locus',
    tabLabel: 'Discovery',
    question: 'Can Discovery find a locus where OG presence and SV carriers both split tall versus short cultivars?',
    summary:
      'This case shows the main value of Discovery with a clean example: one OG and one SV both separate the culm-length groups in the current panel.',
    steps: [
      {
        label: 'In Discovery, select the shared chr11 development locus row',
        detail: 'Open the chr11:21-25 Mb review locus instead of starting from one gene or one SV.',
        inspect: 'Check that the page is organized around a locus, not one claimed answer gene.',
        result: 'You enter a block-level review page instead of overreading one table row.',
      },
      {
        label: 'On the detail page, select the Culm Length trait',
        detail: 'Narrow the attached evidence to the tall-versus-short contrast.',
        inspect: 'Check whether SV patterns across groups and related records become easier to interpret after filtering.',
        result: 'You focus on the trait signal rather than all records attached to the locus.',
      },
      {
        label: 'Review OG0039795 and EV0016290',
        detail: 'Use OG0039795 and EV0016290 as the concrete culm-length review example.',
        inspect: 'OG presence is tall 100% versus short 0%, and EV0016290 is tall 8/8 ALT versus short 0/3 ALT.',
        result: 'You see a candidate where gene-family presence and SV carrier pattern split in the same direction.',
      },
    ],
    notice: [
      'This is a clean Discovery demo case, but it is still exploratory candidate evidence.',
      'Do not present OG0039795 or EV0016290 as validated culm-length causal evidence.',
    ],
    outcome: 'A trait question becomes a locus-level hypothesis with concordant OG and SV group patterns.',
    icon: Map,
  },
];
