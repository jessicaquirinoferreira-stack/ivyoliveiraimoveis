import {
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  FirestoreErrorInfo,
  handleFirestoreError,
  isBootAdminUser,
  OperationType,
} from './config';
import { DEFAULT_TENANT, DEFAULT_TENANT_ID } from '../config/defaultTenant';
import { THEME_PRESETS } from '../config/themes';
import {
  AiJob,
  AnalyticsEvent,
  AuditLog,
  Campaign,
  Development,
  LandingPage,
  Lead,
  Property,
  Tenant,
  Testimonial,
  ThemePresetId,
  UserProfile,
} from '../types/realestate';
import { generateSafeId, slugify } from '../utils/formatters';

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function deepCleanUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => deepCleanUndefined(item)) as unknown as T;
  }
  if (isPlainObject(val)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        out[k] = deepCleanUndefined(v);
      }
    }
    return out as T;
  }
  return val;
}

function cleanUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return deepCleanUndefined(obj);
}

function clampStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen);
}

function clampReqStr(val: unknown, maxLen: number, fallback: string): string {
  const s = typeof val === 'string' ? val.trim() : '';
  return (s || fallback).slice(0, maxLen);
}

function clampSlug(val: unknown, fallback = 'item'): string {
  const raw = slugify(typeof val === 'string' && val.trim() ? val : fallback)
    .slice(0, 155)
    .replace(/^-+|-+$/g, '');
  if (raw && /^[a-z0-9-]+$/.test(raw)) return raw;
  const safeFallback = slugify(fallback).slice(0, 60).replace(/^-+|-+$/g, '');
  return safeFallback || 'imovel';
}

async function getDocFresh(ref: DocumentReference): Promise<DocumentSnapshot> {
  try {
    return await getDocFromServer(ref);
  } catch {
    return getDoc(ref);
  }
}

async function withAdminWriteRetry<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady().catch(() => {});
  }
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const isAuthOrPerm =
      msg.includes('permission') || msg.includes('unauthenticated') || msg.includes('insufficient');
    const isTransient =
      msg.includes('unavailable') ||
      msg.includes('offline') ||
      msg.includes('network') ||
      msg.includes('deadline') ||
      msg.includes('aborted');

    if (isAuthOrPerm && auth.currentUser) {
      await auth.currentUser.getIdToken(true).catch(() => {});
      return fn();
    }
    if (isTransient) {
      await new Promise((resolve) => setTimeout(resolve, 550));
      return fn();
    }
    throw err;
  }
}

function hasOnlyAllowedKeys(obj: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(obj).every((k) => allowed.includes(k));
}

const TENANT_ALLOWED_KEYS = [
  'id', 'ownerUid', 'slug', 'brandName', 'brokerName', 'creci', 'city', 'state', 'regions',
  'whatsapp', 'phone', 'email', 'instagramHandle', 'instagramUrl', 'logoUrl', 'faviconUrl',
  'heroTitle', 'heroSubtitle', 'heroCtaText', 'heroImages', 'aboutHeadline', 'aboutBio',
  'aboutPhotoUrl', 'aboutExperienceYears', 'specialties', 'differentials', 'themePreset',
  'themeConfig', 'seoTitle', 'seoDescription', 'ga4Id', 'gtmId', 'gscVerification',
  'googleAdsId', 'lgpdPrivacyText', 'customDomain', 'status', 'createdAt', 'updatedAt',
] as const;

const PROPERTY_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'slug', 'code', 'title', 'propertyType', 'transactionType',
  'price', 'condoFee', 'iptu', 'city', 'neighborhood', 'address', 'showExactAddress',
  'builtArea', 'totalArea', 'bedrooms', 'suites', 'bathrooms', 'parkingSpaces',
  'description', 'summary', 'features', 'differentials', 'coverImage', 'images',
  'videos', 'panorama360Images', 'virtualTourType', 'status', 'featured', 'sortOrder',
  'seoTitle', 'seoDescription', 'socialCopy', 'whatsappCopy', 'viewsCount', 'createdAt', 'updatedAt',
] as const;

const DEVELOPMENT_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'slug', 'name', 'developer', 'category', 'city',
  'neighborhood', 'deliveryDate', 'priceFrom', 'description', 'technicalSpecs',
  'coverImage', 'images', 'floorPlans', 'videos', 'status', 'featured',
  'seoTitle', 'seoDescription', 'createdAt', 'updatedAt',
] as const;

const LANDING_PAGE_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'propertyId', 'slug', 'template', 'title', 'subtitle',
  'heroImage', 'description', 'ctaText', 'accentColor', 'highlights', 'status',
  'viewsCount', 'leadsCount', 'seoTitle', 'seoDescription', 'createdAt', 'updatedAt',
] as const;

const TESTIMONIAL_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'clientName', 'clientRole', 'quote', 'propertyReference',
  'status', 'createdAt', 'updatedAt',
] as const;

const LEAD_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'name', 'phone', 'email', 'interest', 'propertyId',
  'propertyTitle', 'developmentId', 'landingPageId', 'source', 'utmSource', 'utmMedium',
  'utmCampaign', 'message', 'lgpdConsent', 'status', 'notes', 'createdAt', 'updatedAt',
] as const;

const CAMPAIGN_ALLOWED_KEYS = [
  'id', 'tenantId', 'ownerUid', 'name', 'channel', 'utmSource', 'utmMedium', 'utmCampaign',
  'status', 'budget', 'createdAt', 'updatedAt',
] as const;

function clampStrArray(val: unknown, maxItems: number, maxItemLen = 180): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((s) => s.trim().slice(0, maxItemLen));
}

function clampNumber(val: unknown, min = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < min) return min;
  return n;
}

function clampMapArray(val: unknown, maxItems: number): Record<string, unknown>[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is Record<string, unknown> => isPlainObject(item))
    .slice(0, maxItems)
    .map((item) => deepCleanUndefined(item));
}

function isValidFirestoreTimestamp(val: unknown): val is Timestamp {
  return (
    val instanceof Timestamp ||
    (typeof val === 'object' &&
      val !== null &&
      'seconds' in val &&
      'nanoseconds' in val &&
      typeof (val as { toDate?: unknown }).toDate === 'function')
  );
}

function isValidDocId(val: unknown): val is string {
  return typeof val === 'string' && val.length >= 1 && val.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(val);
}

function isValidSlugStr(val: unknown): val is string {
  return typeof val === 'string' && val.length >= 1 && val.length <= 160 && /^[a-z0-9-]+$/.test(val);
}

function reportListenerError(
  error: unknown,
  operationType: OperationType,
  path: string,
  onError?: (err: Error) => void
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Listener Error: ', JSON.stringify(errInfo));
  if (onError) {
    onError(new Error(JSON.stringify(errInfo)));
  }
}

const VALID_THEME_PRESETS: ThemePresetId[] = [
  'luxo-contemporaneo',
  'minimalista-premium',
  'imobiliario-moderno',
  'elegancia-classica',
  'arquitetura-editorial',
];

function sanitizeThemePreset(val: unknown): ThemePresetId {
  if (typeof val === 'string' && VALID_THEME_PRESETS.includes(val as ThemePresetId)) {
    return val as ThemePresetId;
  }
  return DEFAULT_TENANT.themePreset;
}

const LEGACY_DEFAULT_REGIONS = [
  'Zona Sul',
  'Barra da Tijuca',
  'São Conrado',
  'Lagoa',
  'Leblon',
  'Ipanema',
];

function isLegacyDefaultRegions(regions: unknown): boolean {
  if (!Array.isArray(regions) || regions.length !== LEGACY_DEFAULT_REGIONS.length) return false;
  return LEGACY_DEFAULT_REGIONS.every((item, idx) => regions[idx] === item);
}

/**
 * Merges a persisted Firestore tenant document with safe baseline defaults ONLY when a field
 * is genuinely undefined (or matches an unconfigured initial empty seed), never overwriting
 * intentional admin edits.
 */
function hydrateTenantDocument(loaded: Partial<Tenant>, tenantId: string): Tenant {
  const base = tenantId === DEFAULT_TENANT_ID ? DEFAULT_TENANT : { ...DEFAULT_TENANT, id: tenantId };
  const themePreset = sanitizeThemePreset(loaded.themePreset ?? base.themePreset);
  const presetConfig = THEME_PRESETS[themePreset].config;

  // Only upgrade broken external third-party placeholder URLs from legacy seeds
  const sanitizeLegacyUrl = (val: string | undefined, fallback: string): string => {
    if (val === undefined) return fallback;
    if (val.includes('wxmntYHq')) return fallback;
    return val;
  };

  const isDefaultTenant = tenantId === DEFAULT_TENANT_ID;
  const resolvedRegions =
    Array.isArray(loaded.regions) && loaded.regions.length > 0 && !(isDefaultTenant && isLegacyDefaultRegions(loaded.regions))
      ? loaded.regions
      : base.regions;

  const resolvedCreci =
    loaded.creci && loaded.creci.trim()
      ? loaded.creci
      : isDefaultTenant
        ? base.creci
        : loaded.creci ?? '';
  const resolvedWhatsapp =
    loaded.whatsapp && loaded.whatsapp.trim()
      ? loaded.whatsapp
      : isDefaultTenant
        ? base.whatsapp
        : loaded.whatsapp ?? '';
  const resolvedPhone =
    loaded.phone && loaded.phone.trim()
      ? loaded.phone
      : isDefaultTenant
        ? base.phone
        : loaded.phone ?? '';
  const resolvedEmail =
    loaded.email &&
    loaded.email.trim() &&
    !(isDefaultTenant && loaded.email.trim().toLowerCase() === 'ivyimoveisrj@gmail.com')
      ? loaded.email
      : isDefaultTenant
        ? base.email
        : loaded.email ?? '';

  return {
    ...base,
    ...loaded,
    id: loaded.id || tenantId,
    themePreset,
    themeConfig: {
      ...presetConfig,
      ...(isPlainObject(loaded.themeConfig) ? loaded.themeConfig : {}),
    },
    creci: resolvedCreci,
    whatsapp: resolvedWhatsapp,
    phone: resolvedPhone,
    email: resolvedEmail,
    logoUrl: sanitizeLegacyUrl(loaded.logoUrl, base.logoUrl),
    faviconUrl: sanitizeLegacyUrl(loaded.faviconUrl, base.faviconUrl),
    aboutPhotoUrl: loaded.aboutPhotoUrl !== undefined ? loaded.aboutPhotoUrl : base.aboutPhotoUrl,
    regions: resolvedRegions,
    heroImages: Array.isArray(loaded.heroImages) ? loaded.heroImages : base.heroImages,
    specialties: Array.isArray(loaded.specialties) ? loaded.specialties : base.specialties,
    differentials: Array.isArray(loaded.differentials) ? loaded.differentials : base.differentials,
  };
}

function buildSanitizedTenantFields(source: Partial<Tenant>, fallback: Tenant = DEFAULT_TENANT): Record<string, unknown> {
  const themePreset = sanitizeThemePreset(source.themePreset ?? fallback.themePreset);
  const rawThemeConfig = source.themeConfig ?? fallback.themeConfig ?? THEME_PRESETS[themePreset].config;
  const differentials = Array.isArray(source.differentials ?? fallback.differentials)
    ? (source.differentials ?? fallback.differentials)
        .filter((d): d is { title: string; description: string } => isPlainObject(d))
        .slice(0, 20)
        .map((d) => ({
          title: clampStr(d.title, 160),
          description: clampStr(d.description, 600),
        }))
    : [];

  return cleanUndefined({
    brandName: clampReqStr(source.brandName ?? fallback.brandName, 200, DEFAULT_TENANT.brandName),
    brokerName: clampReqStr(source.brokerName ?? fallback.brokerName, 200, DEFAULT_TENANT.brokerName),
    creci: clampStr(source.creci ?? fallback.creci ?? '', 160),
    city: clampReqStr(source.city ?? fallback.city, 120, DEFAULT_TENANT.city),
    state: clampStr(source.state ?? fallback.state ?? '', 60),
    regions: clampStrArray(source.regions ?? fallback.regions ?? [], 100, 100),
    whatsapp: clampStr(source.whatsapp ?? fallback.whatsapp ?? '', 80),
    phone: clampStr(source.phone ?? fallback.phone ?? '', 80),
    email: clampStr(source.email ?? fallback.email ?? '', 250),
    instagramHandle: clampStr(source.instagramHandle ?? fallback.instagramHandle ?? '', 120),
    instagramUrl: clampStr(source.instagramUrl ?? fallback.instagramUrl ?? '', 1000),
    logoUrl: clampStr(source.logoUrl ?? fallback.logoUrl ?? '', 4096),
    faviconUrl: clampStr(source.faviconUrl ?? fallback.faviconUrl ?? '', 4096),
    heroTitle: clampStr(source.heroTitle ?? fallback.heroTitle ?? '', 500),
    heroSubtitle: clampStr(source.heroSubtitle ?? fallback.heroSubtitle ?? '', 2000),
    heroCtaText: clampStr(source.heroCtaText ?? fallback.heroCtaText ?? '', 200),
    heroImages: clampStrArray(source.heroImages ?? fallback.heroImages ?? [], 30, 4096),
    aboutHeadline: clampStr(source.aboutHeadline ?? fallback.aboutHeadline ?? '', 500),
    aboutBio: clampStr(source.aboutBio ?? fallback.aboutBio ?? '', 10000),
    aboutPhotoUrl: clampStr(source.aboutPhotoUrl ?? fallback.aboutPhotoUrl ?? '', 4096),
    aboutExperienceYears: clampStr(source.aboutExperienceYears ?? fallback.aboutExperienceYears ?? '', 80),
    specialties: clampStrArray(source.specialties ?? fallback.specialties ?? [], 40, 160),
    differentials,
    themePreset,
    themeConfig: isPlainObject(rawThemeConfig) ? deepCleanUndefined(rawThemeConfig) : THEME_PRESETS[themePreset].config,
    seoTitle: clampStr(source.seoTitle ?? fallback.seoTitle ?? '', 300),
    seoDescription: clampStr(source.seoDescription ?? fallback.seoDescription ?? '', 600),
    ga4Id: clampStr(source.ga4Id ?? fallback.ga4Id ?? '', 100),
    gtmId: clampStr(source.gtmId ?? fallback.gtmId ?? '', 100),
    gscVerification: clampStr(source.gscVerification ?? fallback.gscVerification ?? '', 200),
    googleAdsId: clampStr(source.googleAdsId ?? fallback.googleAdsId ?? '', 100),
    lgpdPrivacyText: clampStr(source.lgpdPrivacyText ?? fallback.lgpdPrivacyText ?? '', 12000),
    customDomain: clampStr(source.customDomain ?? fallback.customDomain ?? '', 250),
    status: (source.status ?? fallback.status) === 'inactive' ? 'inactive' : 'active',
  });
}

// Auto-provision admin, user profile, and default Ivy Oliveira tenant on login
export async function bootstrapUserAndTenant(user: User): Promise<{
  profile: UserProfile;
  tenant: Tenant;
  isAdmin: boolean;
}> {
  const isBootAdmin = isBootAdminUser(user);

  const runBootstrap = async (): Promise<{
    profile: UserProfile;
    tenant: Tenant;
    isAdmin: boolean;
  }> => {
    if (isBootAdmin) {
      try {
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDocFresh(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid: user.uid,
            email: clampReqStr(user.email?.toLowerCase(), 200, BOOTSTRAPPED_ADMIN_EMAIL),
            createdAt: serverTimestamp(),
          });
        }
      } catch (adminErr) {
        console.warn('Non-blocking admins doc sync warning:', adminErr);
      }
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDocFresh(userRef);
    let profile: UserProfile;

    if (!userSnap.exists()) {
      const assignedTenantId = isBootAdmin ? DEFAULT_TENANT_ID : `broker_${user.uid.slice(0, 12)}`;
      profile = {
        uid: user.uid,
        email: clampReqStr(user.email?.toLowerCase(), 200, 'admin@ivyoliveira.com'),
        displayName: clampReqStr(user.displayName || user.email?.split('@')[0], 120, 'Administrador'),
        photoURL: clampStr(user.photoURL || '', 1000),
        role: isBootAdmin ? 'admin' : 'broker',
        tenantId: assignedTenantId,
      };
      await setDoc(userRef, {
        ...cleanUndefined(profile as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingProfile = userSnap.data() as UserProfile & { createdAt?: unknown };
      profile = existingProfile;
      if (isBootAdmin && (profile.role !== 'admin' || profile.tenantId !== DEFAULT_TENANT_ID)) {
        const sanitizedProfile: UserProfile = {
          uid: existingProfile.uid || user.uid,
          email: clampReqStr(existingProfile.email || user.email?.toLowerCase(), 200, BOOTSTRAPPED_ADMIN_EMAIL),
          displayName: clampReqStr(
            existingProfile.displayName || user.displayName || user.email?.split('@')[0],
            120,
            'Administrador'
          ),
          photoURL: clampStr(existingProfile.photoURL || user.photoURL || '', 1000),
          role: 'admin',
          tenantId: DEFAULT_TENANT_ID,
        };
        try {
          await setDoc(userRef, {
            ...cleanUndefined(sanitizedProfile as unknown as Record<string, unknown>),
            createdAt: isValidFirestoreTimestamp(existingProfile.createdAt)
              ? existingProfile.createdAt
              : serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (profileErr) {
          console.warn('Non-blocking profile upgrade warning:', profileErr);
        }
        profile = sanitizedProfile;
      }
    }

    const tenantRef = doc(db, 'tenants', profile.tenantId);
    const tenantSnap = await getDocFresh(tenantRef);
    let tenant: Tenant;

    if (!tenantSnap.exists()) {
      const baseTenant: Tenant = isBootAdmin
        ? { ...DEFAULT_TENANT, id: profile.tenantId, ownerUid: user.uid }
        : {
            ...DEFAULT_TENANT,
            id: profile.tenantId,
            ownerUid: user.uid,
            slug: clampSlug(`corretor-${user.uid.slice(0, 8)}`, 'corretor'),
            brandName: profile.displayName,
            brokerName: profile.displayName,
            email: profile.email,
            heroTitle: `Consultoria imobiliária por ${profile.displayName}`,
            aboutHeadline: profile.displayName,
            aboutBio: '',
            creci: '',
            whatsapp: '',
            phone: '',
            instagramHandle: '',
            instagramUrl: '',
          };

      const sanitizedFields = buildSanitizedTenantFields(baseTenant, baseTenant);
      await setDoc(tenantRef, {
        id: baseTenant.id,
        ownerUid: user.uid,
        slug: clampSlug(baseTenant.slug, DEFAULT_TENANT.slug),
        ...sanitizedFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tenant = baseTenant;
    } else {
      const rawExisting = tenantSnap.data() as Partial<Tenant> & { createdAt?: unknown };
      tenant = hydrateTenantDocument(rawExisting, profile.tenantId);

      // Auto-heal broken legacy placeholder URLs, missing theme config, unconfigured contact/regions, or legacy invalid id/ownerUid/createdAt
      const hasLegacyBrokenUrl =
        (typeof rawExisting.logoUrl === 'string' && rawExisting.logoUrl.includes('wxmntYHq')) ||
        (typeof rawExisting.faviconUrl === 'string' && rawExisting.faviconUrl.includes('wxmntYHq'));
      const needsDefaultContactOrRegions =
        profile.tenantId === DEFAULT_TENANT_ID &&
        (!rawExisting.creci?.trim() ||
          !rawExisting.whatsapp?.trim() ||
          !rawExisting.email?.trim() ||
          rawExisting.email.trim().toLowerCase() === 'ivyimoveisrj@gmail.com' ||
          isLegacyDefaultRegions(rawExisting.regions));
      const missingCoreStructure =
        !rawExisting.themeConfig ||
        !rawExisting.themePreset ||
        !isValidDocId(rawExisting.id) ||
        rawExisting.id !== profile.tenantId ||
        !isValidDocId(rawExisting.ownerUid) ||
        !isValidFirestoreTimestamp(rawExisting.createdAt) ||
        !isValidSlugStr(rawExisting.slug);

      if (isBootAdmin && (hasLegacyBrokenUrl || needsDefaultContactOrRegions || missingCoreStructure)) {
        const sanitizedFields = buildSanitizedTenantFields(tenant, DEFAULT_TENANT);
        const preservedSlug = isValidSlugStr(rawExisting.slug)
          ? rawExisting.slug
          : clampSlug(rawExisting.slug || profile.tenantId, DEFAULT_TENANT.slug);
        const healedOwnerUid = isValidDocId(rawExisting.ownerUid) ? rawExisting.ownerUid : user.uid;
        const canPatchInPlace =
          rawExisting.id === profile.tenantId &&
          isValidDocId(rawExisting.ownerUid) &&
          isValidSlugStr(rawExisting.slug) &&
          isValidFirestoreTimestamp(rawExisting.createdAt) &&
          hasOnlyAllowedKeys(rawExisting as Record<string, unknown>, TENANT_ALLOWED_KEYS);
        try {
          if (canPatchInPlace) {
            await updateDoc(tenantRef, {
              ...sanitizedFields,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(tenantRef, {
              id: profile.tenantId,
              ownerUid: healedOwnerUid,
              slug: preservedSlug,
              ...sanitizedFields,
              createdAt: isValidFirestoreTimestamp(rawExisting.createdAt)
                ? rawExisting.createdAt
                : serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          tenant = { ...tenant, id: profile.tenantId, ownerUid: healedOwnerUid, slug: preservedSlug };
        } catch (healErr) {
          console.warn('Non-blocking tenant auto-heal warning:', healErr);
        }
      }
    }

    const adminCheck = isBootAdmin || profile.role === 'admin';
    return { profile, tenant, isAdmin: adminCheck };
  };

  try {
    return await runBootstrap();
  } catch (firstErr) {
    const msg = firstErr instanceof Error ? firstErr.message.toLowerCase() : '';
    const isTransient =
      msg.includes('unavailable') || msg.includes('offline') || msg.includes('network') || msg.includes('deadline');
    if (isTransient) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        return await runBootstrap();
      } catch (retryErr) {
        handleFirestoreError(retryErr, OperationType.WRITE, 'users/bootstrap');
      }
    }
    handleFirestoreError(firstErr, OperationType.WRITE, 'users/bootstrap');
  }
}

// Public Tenant Subscription
export function subscribePublicTenant(
  tenantId: string,
  onData: (tenant: Tenant) => void
): Unsubscribe {
  const ref = doc(db, 'tenants', tenantId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData(hydrateTenantDocument(snap.data() as Partial<Tenant>, tenantId));
      } else {
        onData(DEFAULT_TENANT);
      }
    },
    (err) => {
      console.warn('Tenant fallback active:', err.message);
      onData(DEFAULT_TENANT);
    }
  );
}

// List active tenants (for multi-broker directory or admin tenant switcher)
export async function listTenants(isAdmin: boolean, ownerUid?: string): Promise<Tenant[]> {
  try {
    const q = isAdmin
      ? query(collection(db, 'tenants'))
      : ownerUid
        ? query(collection(db, 'tenants'), where('ownerUid', '==', ownerUid))
        : query(collection(db, 'tenants'), where('status', '==', 'active'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => hydrateTenantDocument(d.data() as Partial<Tenant>, d.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tenants');
  }
}

export function subscribeManagedTenants(
  isAdmin: boolean,
  ownerUid: string,
  onData: (items: Tenant[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'tenants'))
    : query(collection(db, 'tenants'), where('ownerUid', '==', ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => hydrateTenantDocument(d.data() as Partial<Tenant>, d.id));
      onData(items);
    },
    (err) => reportListenerError(err, OperationType.LIST, 'tenants', onError)
  );
}

export async function createTenantDocument(newTenant: Tenant): Promise<void> {
  const path = `tenants/${newTenant.id}`;
  try {
    const currentUid = auth.currentUser?.uid || newTenant.ownerUid;
    const fields = buildSanitizedTenantFields(newTenant, DEFAULT_TENANT);
    await setDoc(doc(db, 'tenants', newTenant.id), {
      id: newTenant.id,
      ownerUid: currentUid,
      slug: clampSlug(newTenant.slug || newTenant.brandName, 'corretor'),
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTenantSettings(tenantId: string, updates: Partial<Tenant>): Promise<void> {
  const path = `tenants/${tenantId}`;
  try {
    await withAdminWriteRetry(async () => {
      const tenantRef = doc(db, 'tenants', tenantId);
      const snap = await getDocFresh(tenantRef);

      if (!snap.exists()) {
        const currentUid = auth.currentUser?.uid;
        if (!currentUid) {
          throw new Error('Sessão administrativa expirada. Faça login novamente.');
        }
        const fields = buildSanitizedTenantFields(updates, DEFAULT_TENANT);
        await setDoc(tenantRef, {
          id: tenantId,
          ownerUid: currentUid,
          slug: clampSlug(updates.slug || tenantId, DEFAULT_TENANT.slug),
          ...fields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as Tenant & { createdAt?: unknown };
      const mergedFields = buildSanitizedTenantFields(
        { ...existing, ...updates },
        tenantId === DEFAULT_TENANT_ID ? DEFAULT_TENANT : existing
      );

      const preservedSlug = isValidSlugStr(existing.slug)
        ? existing.slug
        : clampSlug(existing.slug || tenantId, DEFAULT_TENANT.slug);

      const safeOwnerUid = isValidDocId(existing.ownerUid)
        ? existing.ownerUid
        : auth.currentUser?.uid || '';

      const canPatchInPlace =
        existing.id === tenantId &&
        isValidDocId(existing.ownerUid) &&
        isValidSlugStr(existing.slug) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, TENANT_ALLOWED_KEYS);

      const writeFullCleanDoc = async () => {
        await setDoc(tenantRef, {
          id: tenantId,
          ownerUid: safeOwnerUid,
          slug: preservedSlug,
          ...mergedFields,
          createdAt: isValidFirestoreTimestamp(existing.createdAt)
            ? existing.createdAt
            : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      };

      if (canPatchInPlace) {
        try {
          // Use updateDoc so immutable fields (id, ownerUid, slug, createdAt) stay server-side exact
          await updateDoc(tenantRef, {
            ...mergedFields,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Heal document with full clean schema if patch failed due to legacy field mismatch
          await writeFullCleanDoc();
        }
      } else {
        // Clean rewrite when healing legacy documents with missing/stray fields
        await writeFullCleanDoc();
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Real-time Public Properties Listener
export function subscribePublishedProperties(
  tenantId: string,
  onData: (items: Property[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'properties'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Property);
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      onData(list);
    },
    (err) => reportListenerError(err, OperationType.LIST, 'properties', onError)
  );
}

// Real-time Admin/Broker Properties Listener (isolated by ownerUid unless platform admin)
export function subscribeManagedProperties(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Property[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'properties'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'properties'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Property);
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      onData(list);
    },
    (err) => reportListenerError(err, OperationType.LIST, 'properties', onError)
  );
}

export async function saveProperty(
  property: Omit<Property, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `properties/${property.id}`;
  try {
    const validPropertyTypes = ['casa', 'apartamento', 'cobertura', 'terreno', 'comercial'];
    const validTxTypes = ['venda', 'aluguel', 'lancamento'];
    const validTourTypes = ['photo', 'panorama360', '3d'];
    const validStatuses = ['draft', 'published', 'sold', 'rented'];

    const mutableFields = cleanUndefined({
      slug: clampSlug(property.slug || property.title, property.code || 'imovel'),
      code: clampReqStr(property.code, 40, 'IMV'),
      title: clampReqStr(property.title, 180, 'Imóvel'),
      propertyType: validPropertyTypes.includes(property.propertyType) ? property.propertyType : 'apartamento',
      transactionType: validTxTypes.includes(property.transactionType) ? property.transactionType : 'venda',
      price: clampNumber(property.price, 0),
      condoFee: clampNumber(property.condoFee, 0),
      iptu: clampNumber(property.iptu, 0),
      city: clampReqStr(property.city, 80, 'Rio de Janeiro'),
      neighborhood: clampReqStr(property.neighborhood, 100, 'Centro'),
      address: clampStr(property.address, 240),
      showExactAddress: Boolean(property.showExactAddress),
      builtArea: clampNumber(property.builtArea, 0),
      totalArea: clampNumber(property.totalArea, 0),
      bedrooms: clampNumber(property.bedrooms, 0),
      suites: clampNumber(property.suites, 0),
      bathrooms: clampNumber(property.bathrooms, 0),
      parkingSpaces: clampNumber(property.parkingSpaces, 0),
      description: clampStr(property.description, 8000),
      summary: clampStr(property.summary, 600),
      features: clampStrArray(property.features, 40, 200),
      differentials: clampStrArray(property.differentials, 25, 200),
      coverImage: clampStr(property.coverImage, 2048),
      images: clampMapArray(property.images, 50),
      videos: clampMapArray(property.videos, 12),
      panorama360Images: clampMapArray(property.panorama360Images, 20),
      virtualTourType: validTourTypes.includes(property.virtualTourType) ? property.virtualTourType : 'photo',
      status: validStatuses.includes(property.status) ? property.status : 'draft',
      featured: Boolean(property.featured),
      sortOrder: Number.isFinite(Number(property.sortOrder)) ? Number(property.sortOrder) : 0,
      seoTitle: clampStr(property.seoTitle, 160),
      seoDescription: clampStr(property.seoDescription, 320),
      socialCopy: clampStr(property.socialCopy, 2000),
      whatsappCopy: clampStr(property.whatsappCopy, 1000),
    });

    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'properties', property.id);
      if (isNew) {
        await setDoc(ref, {
          id: property.id,
          tenantId: property.tenantId,
          ownerUid: property.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          viewsCount: clampNumber(property.viewsCount, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: property.id,
          tenantId: property.tenantId,
          ownerUid: property.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          viewsCount: clampNumber(property.viewsCount, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as Property & { createdAt?: unknown };
      const canPatchInPlace =
        existing.id === property.id &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, PROPERTY_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: property.id,
          tenantId: isValidDocId(existing.tenantId) ? existing.tenantId : property.tenantId,
          ownerUid: isValidDocId(existing.ownerUid)
            ? existing.ownerUid
            : (isValidDocId(property.ownerUid) ? property.ownerUid : (auth.currentUser?.uid || '')),
          ...mutableFields,
          viewsCount: clampNumber(existing.viewsCount ?? property.viewsCount, 0),
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProperty(propertyId: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'properties', propertyId)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `properties/${propertyId}`);
  }
}

// Developments
export function subscribePublishedDevelopments(
  tenantId: string,
  onData: (items: Development[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'developments'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Development)),
    (err) => reportListenerError(err, OperationType.LIST, 'developments', onError)
  );
}

export function subscribeManagedDevelopments(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Development[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'developments'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'developments'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Development)),
    (err) => reportListenerError(err, OperationType.LIST, 'developments', onError)
  );
}

export async function saveDevelopment(
  dev: Omit<Development, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `developments/${dev.id}`;
  try {
    const validCategories = ['lancamento', 'condominio', 'residencial', 'comercial'];
    const mutableFields = cleanUndefined({
      slug: clampSlug(dev.slug || dev.name, 'empreendimento'),
      name: clampReqStr(dev.name, 160, 'Empreendimento'),
      developer: clampStr(dev.developer, 120),
      category: validCategories.includes(dev.category) ? dev.category : 'lancamento',
      city: clampReqStr(dev.city, 80, 'Rio de Janeiro'),
      neighborhood: clampReqStr(dev.neighborhood, 100, 'Centro'),
      deliveryDate: clampStr(dev.deliveryDate, 60),
      priceFrom: clampNumber(dev.priceFrom, 0),
      description: clampStr(dev.description, 8000),
      technicalSpecs: clampStrArray(dev.technicalSpecs, 30, 200),
      coverImage: clampStr(dev.coverImage, 2048),
      images: clampMapArray(dev.images, 40),
      floorPlans: clampMapArray(dev.floorPlans, 20),
      videos: clampMapArray(dev.videos, 10),
      status: dev.status === 'published' ? 'published' : 'draft',
      featured: Boolean(dev.featured),
      seoTitle: clampStr(dev.seoTitle, 160),
      seoDescription: clampStr(dev.seoDescription, 320),
    });

    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'developments', dev.id);
      if (isNew) {
        await setDoc(ref, {
          id: dev.id,
          tenantId: dev.tenantId,
          ownerUid: dev.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: dev.id,
          tenantId: dev.tenantId,
          ownerUid: dev.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as Development & { createdAt?: unknown };
      const canPatchInPlace =
        existing.id === dev.id &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, DEVELOPMENT_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: dev.id,
          tenantId: isValidDocId(existing.tenantId) ? existing.tenantId : dev.tenantId,
          ownerUid: isValidDocId(existing.ownerUid)
            ? existing.ownerUid
            : (isValidDocId(dev.ownerUid) ? dev.ownerUid : (auth.currentUser?.uid || '')),
          ...mutableFields,
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteDevelopment(id: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'developments', id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `developments/${id}`);
  }
}

// Landing Pages
export function subscribePublishedLandingPages(
  tenantId: string,
  onData: (items: LandingPage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'landingPages'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as LandingPage)),
    (err) => reportListenerError(err, OperationType.LIST, 'landingPages', onError)
  );
}

export function subscribeManagedLandingPages(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: LandingPage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'landingPages'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'landingPages'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as LandingPage)),
    (err) => reportListenerError(err, OperationType.LIST, 'landingPages', onError)
  );
}

export async function saveLandingPage(
  lp: Omit<LandingPage, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `landingPages/${lp.id}`;
  try {
    const validTemplates = ['editorial-luxo', 'lancamento-impacto', 'minimalista-direto'];
    const mutableFields = cleanUndefined({
      propertyId: clampStr(lp.propertyId, 128),
      slug: clampSlug(lp.slug || lp.title, 'oferta'),
      template: validTemplates.includes(lp.template) ? lp.template : 'editorial-luxo',
      title: clampReqStr(lp.title, 180, 'Oferta Exclusiva'),
      subtitle: clampStr(lp.subtitle, 400),
      heroImage: clampStr(lp.heroImage, 2048),
      description: clampStr(lp.description, 6000),
      ctaText: clampStr(lp.ctaText, 80),
      accentColor: clampStr(lp.accentColor, 30),
      highlights: clampStrArray(lp.highlights, 15, 200),
      status: lp.status === 'published' ? 'published' : 'draft',
      seoTitle: clampStr(lp.seoTitle, 160),
      seoDescription: clampStr(lp.seoDescription, 320),
    });

    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'landingPages', lp.id);
      if (isNew) {
        await setDoc(ref, {
          id: lp.id,
          tenantId: lp.tenantId,
          ownerUid: lp.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          viewsCount: clampNumber(lp.viewsCount, 0),
          leadsCount: clampNumber(lp.leadsCount, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: lp.id,
          tenantId: lp.tenantId,
          ownerUid: lp.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          viewsCount: clampNumber(lp.viewsCount, 0),
          leadsCount: clampNumber(lp.leadsCount, 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as LandingPage & { createdAt?: unknown };
      const canPatchInPlace =
        existing.id === lp.id &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, LANDING_PAGE_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: lp.id,
          tenantId: isValidDocId(existing.tenantId) ? existing.tenantId : lp.tenantId,
          ownerUid: isValidDocId(existing.ownerUid)
            ? existing.ownerUid
            : (isValidDocId(lp.ownerUid) ? lp.ownerUid : (auth.currentUser?.uid || '')),
          ...mutableFields,
          viewsCount: clampNumber(existing.viewsCount ?? lp.viewsCount, 0),
          leadsCount: clampNumber(existing.leadsCount ?? lp.leadsCount, 0),
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteLandingPage(id: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'landingPages', id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `landingPages/${id}`);
  }
}

// Testimonials
export function subscribePublishedTestimonials(
  tenantId: string,
  onData: (items: Testimonial[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'testimonials'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Testimonial)),
    (err) => reportListenerError(err, OperationType.LIST, 'testimonials', onError)
  );
}

export function subscribeManagedTestimonials(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Testimonial[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'testimonials'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'testimonials'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Testimonial)),
    (err) => reportListenerError(err, OperationType.LIST, 'testimonials', onError)
  );
}

export async function saveTestimonial(
  item: Omit<Testimonial, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  try {
    const mutableFields = cleanUndefined({
      clientName: clampReqStr(item.clientName, 120, 'Cliente'),
      clientRole: clampStr(item.clientRole, 120),
      quote: clampReqStr(item.quote, 1200, 'Excelente atendimento.'),
      propertyReference: clampStr(item.propertyReference, 160),
      status: item.status === 'published' ? 'published' : 'draft',
    });

    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'testimonials', item.id);
      if (isNew) {
        await setDoc(ref, {
          id: item.id,
          tenantId: item.tenantId,
          ownerUid: item.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: item.id,
          tenantId: item.tenantId,
          ownerUid: item.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as Testimonial & { createdAt?: unknown };
      const canPatchInPlace =
        existing.id === item.id &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, TESTIMONIAL_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: item.id,
          tenantId: isValidDocId(existing.tenantId) ? existing.tenantId : item.tenantId,
          ownerUid: isValidDocId(existing.ownerUid)
            ? existing.ownerUid
            : (isValidDocId(item.ownerUid) ? item.ownerUid : (auth.currentUser?.uid || '')),
          ...mutableFields,
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `testimonials/${item.id}`);
  }
}

export async function deleteTestimonial(id: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'testimonials', id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `testimonials/${id}`);
  }
}

// Leads (Public Create with LGPD consent; Private Read/Manage)
export async function submitPublicLead(
  lead: Omit<Lead, 'id' | 'status' | 'notes' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!lead.ownerUid) {
    throw new Error('Canal de atendimento aguardando ativação pelo corretor responsável.');
  }
  const id = generateSafeId('lead');
  const validInterests = ['comprar', 'alugar', 'vender', 'investir', 'visita', 'empreendimento', 'informacoes'];
  try {
    await setDoc(doc(db, 'leads', id), {
      ...cleanUndefined({
        id,
        tenantId: lead.tenantId,
        ownerUid: lead.ownerUid,
        name: clampReqStr(lead.name, 120, 'Interessado'),
        phone: clampReqStr(lead.phone, 40, 'Não informado'),
        email: clampStr(lead.email, 200),
        interest: validInterests.includes(lead.interest) ? lead.interest : 'informacoes',
        propertyId: clampStr(lead.propertyId, 128),
        propertyTitle: clampStr(lead.propertyTitle, 200),
        developmentId: clampStr(lead.developmentId, 128),
        landingPageId: clampStr(lead.landingPageId, 128),
        source: clampStr(lead.source, 100),
        utmSource: clampStr(lead.utmSource, 100),
        utmMedium: clampStr(lead.utmMedium, 100),
        utmCampaign: clampStr(lead.utmCampaign, 100),
        message: clampStr(lead.message, 2000),
        lgpdConsent: true,
        status: 'new',
        notes: '',
      }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `leads/${id}`);
  }
}

export function subscribeManagedLeads(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Lead[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'leads'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'leads'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Lead)),
    (err) => reportListenerError(err, OperationType.LIST, 'leads', onError)
  );
}

export async function updateLeadStatus(leadId: string, status: Lead['status'], notes: string): Promise<void> {
  try {
    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'leads', leadId);
      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        throw new Error('Lead não encontrado.');
      }
      const existing = snap.data() as Lead & { createdAt?: unknown };
      const validInterests = ['comprar', 'alugar', 'vender', 'investir', 'visita', 'empreendimento', 'informacoes'];
      const validStatuses: Lead['status'][] = ['new', 'in_progress', 'scheduled', 'converted', 'lost'];

      const nextStatus = validStatuses.includes(status) ? status : existing.status || 'new';
      const nextNotes = clampStr(notes, 2000);
      const canPatchInPlace =
        existing.id === leadId &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, LEAD_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          status: nextStatus,
          notes: nextNotes,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...cleanUndefined({
            id: leadId,
            tenantId: existing.tenantId,
            ownerUid: isValidDocId(existing.ownerUid) ? existing.ownerUid : (auth.currentUser?.uid || ''),
            name: clampReqStr(existing.name, 120, 'Interessado'),
            phone: clampReqStr(existing.phone, 40, 'Não informado'),
            email: clampStr(existing.email, 200),
            interest: validInterests.includes(existing.interest) ? existing.interest : 'informacoes',
            propertyId: clampStr(existing.propertyId, 128),
            propertyTitle: clampStr(existing.propertyTitle, 200),
            developmentId: clampStr(existing.developmentId, 128),
            landingPageId: clampStr(existing.landingPageId, 128),
            source: clampStr(existing.source, 100),
            utmSource: clampStr(existing.utmSource, 100),
            utmMedium: clampStr(existing.utmMedium, 100),
            utmCampaign: clampStr(existing.utmCampaign, 100),
            message: clampStr(existing.message, 2000),
            lgpdConsent: Boolean(existing.lgpdConsent),
            status: nextStatus,
            notes: nextNotes,
          }),
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'leads', leadId)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `leads/${leadId}`);
  }
}

// Analytics Events
export async function trackPublicEvent(
  event: Omit<AnalyticsEvent, 'id' | 'createdAt'>
): Promise<void> {
  if (!event.ownerUid || !event.tenantId) return;
  const id = generateSafeId('evt');
  try {
    await setDoc(doc(db, 'analyticsEvents', id), {
      ...cleanUndefined({
        id,
        tenantId: event.tenantId,
        ownerUid: event.ownerUid,
        eventType: event.eventType,
        targetId: clampStr(event.targetId, 128),
        path: clampReqStr(event.path, 300, '/'),
        source: clampStr(event.source, 120),
        utmSource: clampStr(event.utmSource, 100),
        utmCampaign: clampStr(event.utmCampaign, 100),
      }),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export function subscribeManagedAnalytics(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: AnalyticsEvent[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'analyticsEvents'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'analyticsEvents'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as AnalyticsEvent)),
    (err) => reportListenerError(err, OperationType.LIST, 'analyticsEvents', onError)
  );
}

// Campaigns
export function subscribeManagedCampaigns(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Campaign[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'campaigns'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'campaigns'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Campaign)),
    (err) => reportListenerError(err, OperationType.LIST, 'campaigns', onError)
  );
}

export async function saveCampaign(c: Omit<Campaign, 'createdAt' | 'updatedAt'>, isNew: boolean): Promise<void> {
  try {
    const validStatuses = ['active', 'paused', 'ended'];
    const mutableFields = cleanUndefined({
      name: clampReqStr(c.name, 160, 'Campanha'),
      channel: clampStr(c.channel, 80),
      utmSource: clampStr(c.utmSource, 100),
      utmMedium: clampStr(c.utmMedium, 100),
      utmCampaign: clampStr(c.utmCampaign, 100),
      status: validStatuses.includes(c.status) ? c.status : 'active',
      budget: clampNumber(c.budget, 0),
    });

    await withAdminWriteRetry(async () => {
      const ref = doc(db, 'campaigns', c.id);
      if (isNew) {
        await setDoc(ref, {
          id: c.id,
          tenantId: c.tenantId,
          ownerUid: c.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const snap = await getDocFresh(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          id: c.id,
          tenantId: c.tenantId,
          ownerUid: c.ownerUid || auth.currentUser?.uid || '',
          ...mutableFields,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }

      const existing = snap.data() as Campaign & { createdAt?: unknown };
      const canPatchInPlace =
        existing.id === c.id &&
        isValidDocId(existing.tenantId) &&
        isValidDocId(existing.ownerUid) &&
        isValidFirestoreTimestamp(existing.createdAt) &&
        hasOnlyAllowedKeys(existing as unknown as Record<string, unknown>, CAMPAIGN_ALLOWED_KEYS);

      if (canPatchInPlace) {
        await updateDoc(ref, {
          ...mutableFields,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: c.id,
          tenantId: isValidDocId(existing.tenantId) ? existing.tenantId : c.tenantId,
          ownerUid: isValidDocId(existing.ownerUid)
            ? existing.ownerUid
            : (isValidDocId(c.ownerUid) ? c.ownerUid : (auth.currentUser?.uid || '')),
          ...mutableFields,
          createdAt: isValidFirestoreTimestamp(existing.createdAt) ? existing.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `campaigns/${c.id}`);
  }
}

export async function deleteCampaign(id: string): Promise<void> {
  try {
    await withAdminWriteRetry(() => deleteDoc(doc(db, 'campaigns', id)));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `campaigns/${id}`);
  }
}

// AI Jobs
export function subscribeManagedAiJobs(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: AiJob[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'aiJobs'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'aiJobs'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as AiJob)),
    (err) => reportListenerError(err, OperationType.LIST, 'aiJobs', onError)
  );
}

export async function saveAiJob(job: Omit<AiJob, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const dur = Math.min(120, Math.max(1, Number(job.durationSec) || 1));
    await setDoc(doc(db, 'aiJobs', job.id), {
      ...cleanUndefined({
        id: job.id,
        tenantId: job.tenantId,
        ownerUid: job.ownerUid || auth.currentUser?.uid || '',
        propertyId: clampStr(job.propertyId, 128),
        jobType: job.jobType,
        provider: clampStr(job.provider, 60),
        style: clampStr(job.style, 80),
        durationSec: dur,
        aspectRatio: job.aspectRatio === '9:16' ? '9:16' : '16:9',
        status: job.status,
        inputImageUrls: clampStrArray(job.inputImageUrls, 20, 2048),
        outputUrl: clampStr(job.outputUrl, 2048),
        errorMessage: clampStr(job.errorMessage, 500),
      }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `aiJobs/${job.id}`);
  }
}

// Audit Logs
export function subscribeAuditLogs(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: AuditLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'auditLogs'), where('tenantId', '==', tenantId))
    : query(
        collection(db, 'auditLogs'),
        where('tenantId', '==', tenantId),
        where('ownerUid', '==', ownerUid)
      );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as AuditLog)),
    (err) => reportListenerError(err, OperationType.LIST, 'auditLogs', onError)
  );
}

export async function writeAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  const id = generateSafeId('audit');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      ...cleanUndefined({
        id,
        tenantId: log.tenantId,
        ownerUid: log.ownerUid || auth.currentUser?.uid || '',
        actorUid: log.actorUid || auth.currentUser?.uid || '',
        actorEmail: clampStr(log.actorEmail, 200),
        action: clampReqStr(log.action, 80, 'admin_action'),
        entityType: clampReqStr(log.entityType, 60, 'system'),
        entityId: clampStr(log.entityId, 128),
        summary: clampReqStr(log.summary, 400, 'Ação administrativa registrada'),
      }),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditLogs/${id}`);
  }
}
