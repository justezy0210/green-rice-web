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
        title="Why Korea Needs a Rice Pangenome Database"
        subtitle="Korean rice is a major crop, but cultivar diversity is still difficult to inspect at the assembly level."
        figure={<DatabaseNeedFigure />}
        primary
      >
        <p>
          Many Korean rice genome resources are still easier to study through
          short-read resequencing data than through cultivar-specific assemblies.
        </p>
        <p>
          That makes it hard to ask direct questions about gene content,
          structural differences, and cultivar-level genome organization. Green
          Rice DB was built to make those comparisons easier to explore.
        </p>
      </AboutScene>

      <AboutScene
        label="02 / Background"
        title="Why Assembly-Based Pangenome?"
        subtitle="Resequencing is powerful for reference-based variants, but it cannot fully show sequence that is missing from the reference."
        figure={<ReferenceBiasFigure />}
        reverse
      >
        <p>
          Conventional resequencing analysis maps reads to one reference genome.
          This works well for SNPs, small indels, and other reference-anchored
          variation.
        </p>
        <p>
          The limitation is reference bias. Cultivar-specific sequence, gene
          presence or absence, and larger structural changes can be missed or
          simplified. Green Rice DB therefore starts from per-cultivar assemblies.
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
          Green Rice DB is not only a cultivar list or a phenotype table. It is a
          connected review database where users can move between genome, gene,
          variant, and phenotype context.
        </p>
        <p>
          The goal is to help researchers inspect evidence across layers rather
          than treating any single table as final causal proof.
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
          In practice, the objective is to turn separate genome analysis outputs
          into a web resource that researchers can search and compare directly.
        </p>
        <p>
          Users can inspect cultivar gene models, gene-family patterns,
          structural variant context, phenotype overlays, and candidate discovery
          evidence in one connected interface. The database supports hypothesis
          generation, not causal confirmation.
        </p>
      </AboutScene>

      <AboutScene
        label="05 / Data Scope"
        title="Data Scope"
        subtitle="The current Green Rice DB frame was initially generated for 11 Korean rice cultivars."
        figure={<DataScopeFigure />}
      >
        <p>
          This section defines the boundary of the current release: what data are
          available for browsing, and which results are derived from downstream
          analysis.
        </p>
        <p>
          Discovery should be read as a separate review layer, not as a validated
          marker set or final association result.
        </p>
      </AboutScene>

      <AboutScene
        label="06 / Information Architecture"
        title="Entity-Centered Information Architecture"
        subtitle="This is not an association portal that immediately presents the answer gene for a trait."
        figure={<EntityArchitectureFigure />}
      >
        <p>
          Researchers do not all start from the same question. One user may begin
          with a cultivar, another with a gene, another with a structural variant,
          and another with a phenotype-related candidate.
        </p>
        <p>
          Green Rice DB is organized around those entities so users can follow
          connected evidence across pages instead of being locked into one fixed
          analysis table.
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
          Unlike the Browse pages, Discovery is a derived layer. It asks whether
          phenotype-group contrasts are accompanied by gene-family or structural
          variant differences.
        </p>
        <p>
          When multiple evidence layers point to a possible candidate, the result
          is organized as a reviewable Discovery record. It is meant to help users
          decide what to inspect next and what may deserve follow-up validation.
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
