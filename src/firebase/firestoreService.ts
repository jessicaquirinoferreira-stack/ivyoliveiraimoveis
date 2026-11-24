import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  isBootAdminUser,
  OperationType,
} from './config';
import { DEFAULT_TENANT, DEFAULT_TENANT_ID } from '../config/defaultTenant';
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
  UserProfile,
} from '../types/realestate';
import { generateSafeId } from '../utils/formatters';

function cleanUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

// Auto-provision admin, user profile, and default Ivy Oliveira tenant on login
export async function bootstrapUserAndTenant(user: User): Promise<{
  profile: UserProfile;
  tenant: Tenant;
  isAdmin: boolean;
}> {
  const isBootAdmin = isBootAdminUser(user);

  try {
    if (isBootAdmin) {
      const adminRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: user.uid,
          email: user.email || BOOTSTRAPPED_ADMIN_EMAIL,
          createdAt: serverTimestamp(),
        });
      }
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    let profile: UserProfile;

    if (!userSnap.exists()) {
      const assignedTenantId = isBootAdmin ? DEFAULT_TENANT_ID : `broker_${user.uid.slice(0, 12)}`;
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Administrador',
        photoURL: user.photoURL || '',
        role: isBootAdmin ? 'admin' : 'broker',
        tenantId: assignedTenantId,
      };
      await setDoc(userRef, {
        ...cleanUndefined(profile as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      profile = userSnap.data() as UserProfile;
      if (isBootAdmin && (profile.role !== 'admin' || profile.tenantId !== DEFAULT_TENANT_ID)) {
        profile = {
          ...profile,
          role: 'admin',
          tenantId: DEFAULT_TENANT_ID,
        };
        await updateDoc(userRef, {
          role: 'admin',
          tenantId: DEFAULT_TENANT_ID,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const tenantRef = doc(db, 'tenants', profile.tenantId);
    const tenantSnap = await getDoc(tenantRef);
    let tenant: Tenant;

    if (!tenantSnap.exists()) {
      const baseTenant: Tenant = isBootAdmin
        ? { ...DEFAULT_TENANT, id: profile.tenantId, ownerUid: user.uid }
        : {
            ...DEFAULT_TENANT,
            id: profile.tenantId,
            ownerUid: user.uid,
            slug: `corretor-${user.uid.slice(0, 8).toLowerCase()}`,
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

      await setDoc(tenantRef, {
        ...cleanUndefined(baseTenant as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      tenant = baseTenant;
    } else {
      const existing = tenantSnap.data() as Tenant;
      const useDefaultAbout =
        !existing.aboutPhotoUrl || existing.aboutPhotoUrl.includes('editorial_advisory_studio_');
      const normalizedExisting: Tenant = {
        ...existing,
        heroTitle: existing.heroTitle?.replace(/Curadoria/gi, 'Consultoria') || '',
        heroSubtitle: existing.heroSubtitle?.replace(/Curadoria/gi, 'Consultoria') || '',
        seoTitle: existing.seoTitle?.replace(/Curadoria/gi, 'Consultoria') || '',
        differentials: (existing.differentials || []).map((d) => ({
          ...d,
          title: d.title?.replace(/Curadoria Arquitetônica/gi, 'Seleção Arquitetônica').replace(/Curadoria/gi, 'Consultoria'),
        })),
      };
      tenant =
        profile.tenantId === DEFAULT_TENANT_ID
          ? {
              ...DEFAULT_TENANT,
              ...normalizedExisting,
              logoUrl: existing.logoUrl || DEFAULT_TENANT.logoUrl,
              faviconUrl: existing.faviconUrl || DEFAULT_TENANT.faviconUrl,
              aboutPhotoUrl: useDefaultAbout ? DEFAULT_TENANT.aboutPhotoUrl : existing.aboutPhotoUrl,
            }
          : normalizedExisting;
    }

    const adminCheck = isBootAdmin || profile.role === 'admin';
    return { profile, tenant, isAdmin: adminCheck };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users/bootstrap');
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
        const loaded = snap.data() as Tenant;
        const useDefaultAbout =
          !loaded.aboutPhotoUrl || loaded.aboutPhotoUrl.includes('editorial_advisory_studio_');
        const normalizedLoaded: Tenant = {
          ...loaded,
          heroTitle: loaded.heroTitle?.replace(/Curadoria/gi, 'Consultoria') || '',
          heroSubtitle: loaded.heroSubtitle?.replace(/Curadoria/gi, 'Consultoria') || '',
          seoTitle: loaded.seoTitle?.replace(/Curadoria/gi, 'Consultoria') || '',
          differentials: (loaded.differentials || []).map((d) => ({
            ...d,
            title: d.title?.replace(/Curadoria Arquitetônica/gi, 'Seleção Arquitetônica').replace(/Curadoria/gi, 'Consultoria'),
          })),
        };
        onData(
          tenantId === DEFAULT_TENANT_ID
            ? {
                ...DEFAULT_TENANT,
                ...normalizedLoaded,
                logoUrl: loaded.logoUrl || DEFAULT_TENANT.logoUrl,
                faviconUrl: loaded.faviconUrl || DEFAULT_TENANT.faviconUrl,
                aboutPhotoUrl: useDefaultAbout ? DEFAULT_TENANT.aboutPhotoUrl : loaded.aboutPhotoUrl,
              }
            : normalizedLoaded
        );
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
    return snap.docs.map((d) => d.data() as Tenant);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tenants');
  }
}

export async function updateTenantSettings(tenantId: string, updates: Partial<Tenant>): Promise<void> {
  const path = `tenants/${tenantId}`;
  try {
    const safeUpdates = cleanUndefined(updates as Record<string, unknown>);
    delete safeUpdates.id;
    delete safeUpdates.ownerUid;
    delete safeUpdates.createdAt;
    await updateDoc(doc(db, 'tenants', tenantId), {
      ...safeUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Real-time Public Properties Listener
export function subscribePublishedProperties(
  tenantId: string,
  onData: (items: Property[]) => void
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
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'properties');
    }
  );
}

// Real-time Admin/Broker Properties Listener (isolated by ownerUid unless platform admin)
export function subscribeManagedProperties(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Property[]) => void
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
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'properties');
    }
  );
}

export async function saveProperty(
  property: Omit<Property, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `properties/${property.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'properties', property.id), {
        ...cleanUndefined(property as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload = cleanUndefined(property as unknown as Record<string, unknown>);
      delete payload.id;
      delete payload.tenantId;
      delete payload.ownerUid;
      delete payload.createdAt;
      await updateDoc(doc(db, 'properties', property.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProperty(propertyId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'properties', propertyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `properties/${propertyId}`);
  }
}

// Developments
export function subscribePublishedDevelopments(
  tenantId: string,
  onData: (items: Development[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'developments'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Development)),
    (err) => handleFirestoreError(err, OperationType.LIST, 'developments')
  );
}

export function subscribeManagedDevelopments(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Development[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'developments')
  );
}

export async function saveDevelopment(
  dev: Omit<Development, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `developments/${dev.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'developments', dev.id), {
        ...cleanUndefined(dev as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload = cleanUndefined(dev as unknown as Record<string, unknown>);
      delete payload.id;
      delete payload.tenantId;
      delete payload.ownerUid;
      delete payload.createdAt;
      await updateDoc(doc(db, 'developments', dev.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteDevelopment(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'developments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `developments/${id}`);
  }
}

// Landing Pages
export function subscribePublishedLandingPages(
  tenantId: string,
  onData: (items: LandingPage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'landingPages'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as LandingPage)),
    (err) => handleFirestoreError(err, OperationType.LIST, 'landingPages')
  );
}

export function subscribeManagedLandingPages(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: LandingPage[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'landingPages')
  );
}

export async function saveLandingPage(
  lp: Omit<LandingPage, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const path = `landingPages/${lp.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'landingPages', lp.id), {
        ...cleanUndefined(lp as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload = cleanUndefined(lp as unknown as Record<string, unknown>);
      delete payload.id;
      delete payload.tenantId;
      delete payload.ownerUid;
      delete payload.createdAt;
      await updateDoc(doc(db, 'landingPages', lp.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteLandingPage(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'landingPages', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `landingPages/${id}`);
  }
}

// Testimonials
export function subscribePublishedTestimonials(
  tenantId: string,
  onData: (items: Testimonial[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'testimonials'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'published')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data() as Testimonial)),
    (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
  );
}

export function subscribeManagedTestimonials(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Testimonial[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
  );
}

export async function saveTestimonial(
  item: Omit<Testimonial, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  try {
    if (isNew) {
      await setDoc(doc(db, 'testimonials', item.id), {
        ...cleanUndefined(item as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload = cleanUndefined(item as unknown as Record<string, unknown>);
      delete payload.id;
      delete payload.tenantId;
      delete payload.ownerUid;
      delete payload.createdAt;
      await updateDoc(doc(db, 'testimonials', item.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `testimonials/${item.id}`);
  }
}

export async function deleteTestimonial(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'testimonials', id));
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
  try {
    await setDoc(doc(db, 'leads', id), {
      ...cleanUndefined({
        ...lead,
        id,
        status: 'new',
        notes: '',
        lgpdConsent: true,
      } as unknown as Record<string, unknown>),
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
  onData: (items: Lead[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'leads')
  );
}

export async function updateLeadStatus(leadId: string, status: Lead['status'], notes: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'leads', leadId), {
      status,
      notes: notes.slice(0, 2000),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `leads/${leadId}`);
  }
}

export async function deleteLead(leadId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'leads', leadId));
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
      ...cleanUndefined({ ...event, id } as unknown as Record<string, unknown>),
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
  onData: (items: AnalyticsEvent[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'analyticsEvents')
  );
}

// Campaigns
export function subscribeManagedCampaigns(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: Campaign[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'campaigns')
  );
}

export async function saveCampaign(c: Omit<Campaign, 'createdAt' | 'updatedAt'>, isNew: boolean): Promise<void> {
  try {
    if (isNew) {
      await setDoc(doc(db, 'campaigns', c.id), {
        ...cleanUndefined(c as unknown as Record<string, unknown>),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const payload = cleanUndefined(c as unknown as Record<string, unknown>);
      delete payload.id;
      delete payload.tenantId;
      delete payload.ownerUid;
      delete payload.createdAt;
      await updateDoc(doc(db, 'campaigns', c.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `campaigns/${c.id}`);
  }
}

// AI Jobs
export function subscribeManagedAiJobs(
  tenantId: string,
  ownerUid: string,
  isAdmin: boolean,
  onData: (items: AiJob[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'aiJobs')
  );
}

export async function saveAiJob(job: Omit<AiJob, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    await setDoc(doc(db, 'aiJobs', job.id), {
      ...cleanUndefined(job as unknown as Record<string, unknown>),
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
  onData: (items: AuditLog[]) => void
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
    (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
  );
}

export async function writeAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  const id = generateSafeId('audit');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      ...cleanUndefined({ ...log, id } as unknown as Record<string, unknown>),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditLogs/${id}`);
  }
}
