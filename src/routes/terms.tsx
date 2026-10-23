import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — UNOOCC" },
      {
        name: "description",
        content: "Terms for using the UNOOCC room availability pilot at Ramdeobaba University.",
      },
      { property: "og:title", content: "Terms of use — UNOOCC" },
      {
        property: "og:description",
        content: "UNOOCC is a pilot; room status is a guide, not a booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader eyebrow="Legal" title="Terms of use" />
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-muted-foreground sm:px-6">
        <p>
          UNOOCC is a student pilot project. Room status is a guide based on the timetable and
          faculty updates — it is not a room booking.
        </p>
        <p>
          Rooms marked “Possibly free” have not been verified. Always respect classes in progress
          and university rules for room use.
        </p>
        <p>
          Faculty updates must be accurate and posted only by teaching staff. Misuse may lead to
          access being removed.
        </p>
      </div>
    </>
  ),
});
