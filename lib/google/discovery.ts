import { googleApiFetch } from "./oauth";

export type GoogleDiscoveryResources = {
  ga4Properties: Array<{ id: string; label: string; accountId: string }>;
  gscSites: Array<{ id: string; label: string; permissionLevel?: string }>;
  gbpAccounts: Array<{ id: string; label: string }>;
  gbpLocations: Array<{ id: string; label: string; accountId: string }>;
};

type AccountSummariesResponse = {
  accountSummaries?: Array<{ account?: string; displayName?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }>;
  nextPageToken?: string;
};

type SearchConsoleSitesResponse = {
  siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
};

type GbpAccountsResponse = {
  accounts?: Array<{ name?: string; accountName?: string }>;
  nextPageToken?: string;
};

type GbpLocationsResponse = {
  locations?: Array<{ name?: string; title?: string; storeCode?: string }>;
  nextPageToken?: string;
};

async function listGa4Properties(accessToken: string) {
  const properties: GoogleDiscoveryResources["ga4Properties"] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL("https://analyticsadmin.googleapis.com/v1alpha/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await googleApiFetch<AccountSummariesResponse>(url.toString(), accessToken);
    for (const account of response.accountSummaries ?? []) {
      for (const property of account.propertySummaries ?? []) {
        if (!property.property) continue;
        properties.push({ id: property.property, label: property.displayName || property.property, accountId: account.account || "" });
      }
    }
    pageToken = response.nextPageToken;
    if (!pageToken) break;
  }
  return properties;
}

async function listGscSites(accessToken: string) {
  const response = await googleApiFetch<SearchConsoleSitesResponse>("https://www.googleapis.com/webmasters/v3/sites", accessToken);
  return (response.siteEntry ?? []).filter((site): site is { siteUrl: string; permissionLevel?: string } => Boolean(site.siteUrl)).map((site) => ({ id: site.siteUrl, label: site.siteUrl, permissionLevel: site.permissionLevel }));
}

async function listGbpAccounts(accessToken: string) {
  const accounts: GoogleDiscoveryResources["gbpAccounts"] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    url.searchParams.set("pageSize", "20");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await googleApiFetch<GbpAccountsResponse>(url.toString(), accessToken);
    for (const account of response.accounts ?? []) if (account.name) accounts.push({ id: account.name, label: account.accountName || account.name });
    pageToken = response.nextPageToken;
    if (!pageToken) break;
  }
  return accounts;
}

async function listGbpLocations(accessToken: string, accounts: GoogleDiscoveryResources["gbpAccounts"]) {
  const locations: GoogleDiscoveryResources["gbpLocations"] = [];
  for (const account of accounts) {
    let pageToken: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.id}/locations`);
      url.searchParams.set("readMask", "name,title,storeCode");
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await googleApiFetch<GbpLocationsResponse>(url.toString(), accessToken);
      for (const location of response.locations ?? []) if (location.name) locations.push({ id: location.name, label: location.title || location.storeCode || location.name, accountId: account.id });
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
  }
  return locations;
}

export async function discoverGoogleResources(accessToken: string) {
  const [ga4, gsc, gbp] = await Promise.allSettled([listGa4Properties(accessToken), listGscSites(accessToken), listGbpAccounts(accessToken)]);
  const gbpAccounts = gbp.status === "fulfilled" ? gbp.value : [];
  const locations = gbp.status === "fulfilled" ? await listGbpLocations(accessToken, gbpAccounts) : [];
  return {
    resources: { ga4Properties: ga4.status === "fulfilled" ? ga4.value : [], gscSites: gsc.status === "fulfilled" ? gsc.value : [], gbpAccounts, gbpLocations: locations },
    errors: {
      ga4: ga4.status === "rejected" ? "GA4 properties could not be loaded." : null,
      gsc: gsc.status === "rejected" ? "Search Console sites could not be loaded." : null,
      gbp: gbp.status === "rejected" ? "Business Profile accounts could not be loaded." : null,
    },
  };
}
