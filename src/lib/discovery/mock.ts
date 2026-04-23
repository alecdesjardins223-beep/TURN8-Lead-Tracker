import type { DiscoveryProvider, DiscoveryResult, SearchProfileInput } from "./types";

// Realistic-looking stub candidates keyed by archetype.
// These are clearly fictional (example.com domains, placeholder LinkedIn paths).
const MOCK_CANDIDATES: Record<string, Array<{
  firstName: string; lastName: string; title: string; company: string; location: string;
}>> = {
  FOUNDER: [
    { firstName: "Maya",    lastName: "Okonkwo",   title: "Co-Founder & CEO",      company: "Verdant Capital Labs",   location: "New York, NY" },
    { firstName: "Daniel",  lastName: "Huang",     title: "Founder",               company: "Meridian Ventures",      location: "Brooklyn, NY" },
    { firstName: "Priya",   lastName: "Nair",      title: "Founder & Managing Partner", company: "Sequoia Seed Group", location: "Manhattan, NY" },
    { firstName: "Carlos",  lastName: "Espinoza",  title: "Co-Founder",            company: "Atlas Fintech",          location: "New York, NY" },
    { firstName: "Sophie",  lastName: "Laurent",   title: "Founding Partner",      company: "Lakeshore Innovation",   location: "New York, NY" },
  ],
  EXECUTIVE: [
    { firstName: "James",   lastName: "Whitfield", title: "Chief Investment Officer", company: "Northbridge Asset Mgmt", location: "Greenwich, CT" },
    { firstName: "Amara",   lastName: "Diallo",    title: "Managing Director",      company: "Pantheon Capital",       location: "New York, NY" },
    { firstName: "Richard", lastName: "Caldwell",  title: "EVP, Private Wealth",    company: "Sterling Advisory Group", location: "New York, NY" },
    { firstName: "Elena",   lastName: "Marchetti", title: "VP of Strategy",         company: "Concord Global Partners", location: "New York, NY" },
    { firstName: "Thomas",  lastName: "Bergmann",  title: "Principal",              company: "Axiom Investment Group", location: "Stamford, CT" },
  ],
  BOARD_MEMBER: [
    { firstName: "Patricia", lastName: "Ashworth", title: "Independent Board Director", company: "Horizon Financial Corp", location: "New York, NY" },
    { firstName: "Gregory",  lastName: "Mbeki",    title: "Non-Executive Director", company: "Vantage Growth Partners", location: "New York, NY" },
    { firstName: "Susan",    lastName: "Okafor",   title: "Board Chair",            company: "Summit Holdings Group",  location: "New York, NY" },
    { firstName: "David",    lastName: "Tanaka",   title: "Board Member",           company: "Pacific Rim Capital",    location: "New York, NY" },
    { firstName: "Claire",   lastName: "Fontaine", title: "Lead Independent Director", company: "Arbor Wealth Advisors", location: "Manhattan, NY" },
  ],
  DONOR: [
    { firstName: "William",  lastName: "Forsythe",  title: "Principal",             company: "Forsythe Family Office", location: "New York, NY" },
    { firstName: "Margaret", lastName: "Hurst",     title: "Philanthropic Director", company: "Hurst Charitable Foundation", location: "New York, NY" },
    { firstName: "Robert",   lastName: "Ashby",     title: "Trustee",               company: "Ashby Endowment Trust",  location: "New York, NY" },
    { firstName: "Catherine", lastName: "Blaine",   title: "Chair",                 company: "Blaine Family Foundation", location: "New York, NY" },
    { firstName: "Jonathan", lastName: "Mercer",    title: "Major Gifts Advisor",   company: "Mercer Philanthropies",  location: "New York, NY" },
  ],
};

const FALLBACK_CANDIDATES = MOCK_CANDIDATES.FOUNDER;

export class MockDiscoveryProvider implements DiscoveryProvider {
  readonly name = "mock";

  async discover(profile: SearchProfileInput): Promise<DiscoveryResult> {
    await new Promise((r) => setTimeout(r, 400)); // simulate latency

    const pool = MOCK_CANDIDATES[profile.archetype] ?? FALLBACK_CANDIDATES;

    const candidates = pool.map((c) => ({
      ...c,
      source: "[mock — configure PERPLEXITY_API_KEY for real discovery]",
    }));

    return {
      candidates,
      rawOutput: { provider: "mock", profile: profile.name, archetype: profile.archetype },
    };
  }
}
