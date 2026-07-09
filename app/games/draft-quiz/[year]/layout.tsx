import type { Metadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ year: string }> }
): Promise<Metadata> {
  const { year } = await params;
  const y = parseInt(year, 10);
  if (Number.isNaN(y)) {
    return { title: 'NBA Draft Quiz', description: 'Name every player from a past NBA Draft.' };
  }
  const title = `${y} NBA Draft Quiz`;
  const description = `How well do you remember the ${y} NBA Draft? Name every player picked in every round in this free interactive draft-recall quiz and track your score on HoopsData.`;
  return {
    title,
    description,
    openGraph: { title: `${title} | HoopsData`, description },
    twitter: { title: `${title} | HoopsData`, description },
  };
}

export default function DraftQuizYearLayout({ children }: { children: React.ReactNode }) {
  return children;
}
