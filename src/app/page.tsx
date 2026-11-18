"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(
  () => import("@/src/components/map/LeafletMap"),
  { ssr: false },
);

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <LeafletMap />
    </div>
  );
}
