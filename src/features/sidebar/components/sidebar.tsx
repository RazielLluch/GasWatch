'use client';

import {useState} from "react";
import {Bookmark, Clock3, Compass, Menu, Navigation, Settings, Map } from "lucide-react";
import {Navbar} from "@/features/sidebar/components/navbar";
import Searchbar from "@/features/sidebar/components/searchbar";

export function Sidebar(){

  const [activeSearch, setActiveSearch] = useState("");

  return (
    <div
      id="sidebar"
      className="flex pointer-events-none h-dvh z-10"
    >
      <div className="flex">
        <nav
          id="navbar"
          className="flex pointer-events-auto h-dvh w-20 flex-col items-center border border-border/60 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-lg backdrop-blur"
          aria-label="Main navigation"
        >
          <button
            type="button"
            className="mb-3 grid size-11 place-items-center rounded-full hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex w-full flex-col items-center gap-1">
            <Navbar icon={<Compass className="size-5" />} label="Explore" />
            <Navbar icon={<Bookmark className="size-5" />} label="Saved" />
            <Navbar icon={<Clock3 className="size-5" />} label="Recents" />
            <Navbar icon={<Map className="size-5" />} label="Map" />
          </div>

          <Navbar
            icon={<Settings className="size-5" />}
            label="Settings"
            className="mt-auto"
          />
        </nav>

        {activeSearch && (
          <aside
            id="results-panel"
            className="pointer-events-auto w-[min(23rem,calc(100vw-7.5rem))] overflow-hidden rounded-r-4xl border border-border/60 bg-background/95 backdrop-blur"
            aria-label="Search results"
          >
            <div className="h-18"/>

            <div className="border-b border-border/60 px-5 py-4">
              <p className="text-xs text-muted-foreground">Results for</p>
              <h2 className="mt-1 truncate text-lg font-semibold">
                {activeSearch}
              </h2>
            </div>

            <div className="h-full overflow-y-auto p-3">
              {[1, 2, 3, 4].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                    <Navigation className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      Search result {item}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Address or location details
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}

        <div>
        </div>
      </div>

      <div
        id="searchbar"
        className="pointer-events-auto absolute left-22 top-3 w-[min(22rem,calc(100vw-7.5rem))]"
      >
        <Searchbar onSearch={setActiveSearch} />
      </div>
    </div>
  )
}