import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — UNOOCC" },
      {
        name: "description",
        content: "How UNOOCC handles data: no cameras, no sensors, no student tracking.",
      },
      { property: "og:title", content: "Privacy — UNOOCC" },
      {
        property: "og:description",
        content: "UNOOCC is timetable-based and stores no personal data from students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Legal" title="Privacy" />
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-muted-foreground sm:px-6">
        <p>
          UNOOCC uses Supabase for room records, timetable sources and reviewed faculty updates.
          Coordinator uploads are kept in private storage. The project uses no cameras, WiFi
          tracking or occupancy sensors. A listed schedule does not measure physical occupancy.
        </p>
        <p>
          Student accounts are not required. Authorized faculty accounts are managed through
          Supabase Auth; faculty updates record the submitter's name and faculty ID so changes can
          be reviewed.
        </p>
        <p>Your favourite rooms and display preferences are saved only in your own browser.</p>
      </div>
    </>
  ),
});
