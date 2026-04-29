import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DataScopeFigure,
  DatabaseNeedFigure,
  EntityArchitectureFigure,
  PangenomeOverviewFigure,
  ProjectObjectiveFigure,
  ReferenceBiasFigure,
} from '@/components/about/AboutFigures';
import { DiscoveryWorkflowFigure } from '@/components/about/DiscoveryWorkflowFigure';

export function AboutPage() {
  useEffect(() => {
    const root = document.documentElement;
    const previousSnapType = root.style.scrollSnapType;
    const previousScrollBehavior = root.style.scrollBehavior;
    const desktopQuery = window.matchMedia('(min-width: 768px)');

    const syncScrollSnap = () => {
      if (desktopQuery.matches) {
        root.style.scrollSnapType = 'y mandatory';
        root.style.scrollBehavior = 'smooth';
      } else {
        root.style.scrollSnapType = previousSnapType;
        root.style.scrollBehavior = previousScrollBehavior;
      }
    };

    syncScrollSnap();
    desktopQuery.addEventListener('change', syncScrollSnap);

    return () => {
      desktopQuery.removeEventListener('change', syncScrollSnap);
      root.style.scrollSnapType = previousSnapType;
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return (
    <div className="space-y-12 pb-12">
      <AboutScene
        label="01 / Why This DB Is Needed"
        title="Why does Korea need a rice pangenome database?"
        subtitle="Korean rice is agriculturally important, but public assembly-level resources for Korean cultivars are still limited compared with resequencing-based variation data."
        figure={<DatabaseNeedFigure />}
        primary
      >
        <p>
          Korean rice has strong agronomic value, but cultivar diversity is still
          difficult to inspect through connected assembly-level evidence.
        </p>
        <p>
          Green Rice DB focuses on that gap: 11 Korean cultivar assemblies linked
          with genes, structural variants, and phenotype context.
        </p>
      </AboutScene>

      <AboutScene
        label="02 / Background"
        title="Why assembly-based pan-genome?"
        subtitle="Rice genomics has many resequencing datasets, but assembly-level Korean cultivar resources are still limited."
        figure={<ReferenceBiasFigure />}
        reverse
      >
        <p>
          Resequencing is useful for SNPs and short indels, but it usually maps reads
          to a single reference genome. Reference-missing sequence, cultivar-specific
          genes, gene presence/absence variation, large insertions or deletions, and
          complex structural variation can be missed or simplified.
        </p>
        <p>
          For Korean rice cultivars, a de novo assembly-based pangenome resource is
          needed to compare gene content and genome structure more directly across
          cultivars.
        </p>
      </AboutScene>

      <AboutScene
        label="03 / Our DB"
        title="Green Rice DB"
        subtitle={
          <>
            A web database for exploring de novo assembly-based pan-genome
            information from Korean <em>Oryza sativa japonica</em> cultivars.
          </>
        }
        figure={<PangenomeOverviewFigure />}
        reverse
      >
        <p>
          Green Rice DB is a review space for moving between cultivar assemblies,
          gene families, structural variants, and phenotype context without treating
          any single table as causal proof.
        </p>
      </AboutScene>

      <AboutScene
        label="04 / Project Objective"
        title="Project Objective"
        subtitle={
          <>
            Make assembly-based comparative genome information for Korean{' '}
            <em>Oryza sativa japonica</em> cultivars searchable and reviewable on
            the web.
          </>
        }
        figure={<ProjectObjectiveFigure />}
      >
        <p>
          Green Rice DB groups related genes across cultivar assemblies, summarizes
          structural variants, and overlays phenotype-group information so users
          can review candidate gene and variant evidence.
        </p>
        <p>
          The database is a hypothesis-generating resource. It helps users find
          and prioritize candidate loci that require follow-up validation; it does
          not confirm causal variants.
        </p>
      </AboutScene>

      <AboutScene
        label="05 / Data Scope"
        title="Data Scope"
        subtitle="The current Green Rice DB frame was initially generated for 11 Korean rice cultivars."
        figure={<DataScopeFigure />}
      >
        <p>
          The release includes cultivar phenotype information, assemblies, gene
          annotation, gene family groups, phenotype overlays, and structural variant
          results. Counts in the figure describe the current database scope.
        </p>
      </AboutScene>

      <AboutScene
        label="06 / Information Architecture"
        title="Entity-Centered Information Architecture"
        subtitle="This is not an association portal that immediately presents the answer gene for a trait."
        figure={<EntityArchitectureFigure />}
      >
        <p>
          The interface is designed around entities such as cultivars, genes,
          gene families, structural variants, regions, and discovery candidates.
          Users can follow those entities across evidence layers instead of seeing
          only one analysis table.
        </p>
        <p>
          This structure lets users inspect candidate evidence directly and decide
          whether a locus, gene family, or structural variant is worth deeper validation.
        </p>
      </AboutScene>

      <AboutScene
        label="07 / Discovery Workflow"
        title="How Discovery Evidence Is Built"
        subtitle="Discovery evidence links trait-group contrast, gene family patterns, and structural variant context into reviewable candidate records."
        figure={<DiscoveryWorkflowFigure />}
        reverse
      >
        <p>
          Cultivars are grouped by trait context, then gene family patterns and
          structural variant carrier patterns are compared against those groups.
          Candidate evidence is built where these layers point to the same locus.
        </p>
        <p>
          Each candidate is classified by local impact context, such as gene-body
          or nearby regulatory position, so users can decide which locus needs
          deeper validation.
        </p>
      </AboutScene>
    </div>
  );
}

function AboutScene({
  label,
  title,
  subtitle,
  figure,
  children,
  primary = false,
  reverse = false,
}: {
  label: string;
  title: string;
  subtitle: ReactNode;
  figure: ReactNode;
  children: ReactNode;
  primary?: boolean;
  reverse?: boolean;
}) {
  const TitleTag = primary ? 'h1' : 'h2';
  const { ref, visible } = useScrollReveal();

  return (
    <section className="flex items-center py-4 md:min-h-[calc(100svh-5rem)] md:snap-center md:snap-always md:py-0">
      <div
        ref={ref}
        className={`mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-5 rounded-lg border border-gray-200 bg-white px-4 py-5 transition-all duration-700 ease-out md:min-h-[min(580px,calc(100svh-14rem))] md:gap-8 md:px-8 md:py-9 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] ${
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-5 scale-[0.985] opacity-20'
        }`}
      >
        <div className={`max-w-xl ${reverse ? 'lg:order-2' : ''}`}>
          <div className="text-xs font-medium uppercase text-green-700">{label}</div>
          <TitleTag className="mt-2 text-2xl font-semibold text-gray-950 md:mt-3 md:text-4xl">
            {title}
          </TitleTag>
          <p className="mt-3 text-sm leading-relaxed text-gray-700 md:mt-4 md:text-base">{subtitle}</p>
          <div className="mt-4 space-y-2.5 text-sm leading-relaxed text-gray-600 md:mt-6 md:space-y-3">
            {children}
          </div>
        </div>

        <div className={`min-w-0 ${reverse ? 'lg:order-1' : ''}`}>{figure}</div>
      </div>
    </section>
  );
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktopViewport = window.matchMedia('(min-width: 768px)').matches;
    if (reduceMotion || !desktopViewport) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0.2,
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}
