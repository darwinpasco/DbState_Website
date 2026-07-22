import type { ImageMetadata } from "astro";
import objectDiffImage from "../assets/product/object-diff.png";
import referenceDataDiffImage from "../assets/product/reference-data-diff.png";
import releasePlanImage from "../assets/product/release-plan.png";
import schemaCompareImage from "../assets/product/schema-compare.png";

export type ProductScreenshot = {
  id: string;
  title: string;
  description: string;
  alt: string;
  image: ImageMetadata;
  featured: boolean;
};

export const productScreenshots: ProductScreenshot[] = [
  {
    id: "schema-compare",
    title: "Schema Compare",
    description:
      "Compare repository desired state with a target PostgreSQL database and identify different, database-only, repository-only, and in-sync objects.",
    alt: "DbState Schema Compare results grid showing the public.actor table as repoDifferent and several PostgreSQL tables as databaseOnly.",
    image: schemaCompareImage,
    featured: true,
  },
  {
    id: "object-diff",
    title: "Object Diff",
    description:
      "Inspect repository and database definitions for a selected object before deciding how to handle the difference.",
    alt: "DbState Object Diff screen comparing repository and database DDL for public.actor, with the repository-only dbstate_demo_note text column visible.",
    image: objectDiffImage,
    featured: false,
  },
  {
    id: "reference-data-diff",
    title: "Reference Data Diff",
    description:
      "Review repository-only, database-only, different, and in-sync reference-data rows.",
    alt: "DbState Data Diff screen for public.country showing row counts for similar, different, repositoryOnly, and databaseOnly states.",
    image: referenceDataDiffImage,
    featured: false,
  },
  {
    id: "release-plan",
    title: "Release Plan",
    description:
      "Select supported release candidates and review the planned handoff before any database execution occurs outside DbState.",
    alt: "DbState Release Plan screen showing selected schema release candidates, manual review labels, and review-only candidate explanations.",
    image: releasePlanImage,
    featured: false,
  },
];
