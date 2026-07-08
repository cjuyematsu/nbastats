'use client';

import React from 'react';
import Link from 'next/link';
import { buildCompareSlug } from '@/app/data/compareMatchups';
import { exploreLinksForNames } from '@/lib/compareExplore';

interface CompareExploreLinksProps {
  names: string[];
}

export default function CompareExploreLinks({ names }: CompareExploreLinksProps) {
  if (names.length < 2) return null;
  const excludeSlug = names.length === 2 ? buildCompareSlug(names[0], names[1]) : null;
  const links = exploreLinksForNames(names, excludeSlug);
  if (links.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-slate-100">Keep Exploring</h3>
      <div className="flex flex-wrap gap-4">
        {links.map((l) => (
          <Link
            key={l.slug}
            href={`/compare/${l.slug}`}
            className="text-sky-600 dark:text-sky-400 hover:underline"
          >
            {l.a} vs {l.b}
          </Link>
        ))}
      </div>
    </div>
  );
}
