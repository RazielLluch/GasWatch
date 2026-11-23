"use client";

import dynamic from "next/dynamic";
import {Sidebar} from "@/features/sidebar/components/sidebar";

const LeafletMap = dynamic(
  () => import("@/features/map/LeafletMap"),
  { ssr: false },
);

export default function Home() {

  return (
    <div className="relative h-dvh w-dvw overflow-hidden overscroll-none">
      <div id="map" className="absolute inset-0 z-0">
        <LeafletMap />
      </div>

      <Sidebar />
    </div>
  );
}