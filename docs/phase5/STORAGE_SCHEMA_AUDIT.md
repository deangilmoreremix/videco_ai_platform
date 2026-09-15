# Storage Schema Audit

**Date:** 2026-09-15  
**Status:** PARTIAL - Bucket list obtained, details limited  
**Project:** VideoRemix Product (bzxohkrxcwodllketcpz)

---

## Storage Buckets Found

| Bucket Name | Public Status | Purpose | Code Reference |
|-------------|---------------|---------|----------------|
| videos | Unknown | Video storage | Likely `src/lib/storage.ts` |
| user-data | Unknown | User data | Unknown |
| smartcrm-contacts | Unknown | SmartCRM integration | Unknown |
| smartcrm-deals | Unknown | SmartCRM integration | Unknown |
| smartcrm-calendar | Unknown | SmartCRM integration | Unknown |
| smartcrm-agents | Unknown | SmartCRM integration | Unknown |
| smartcrm-avatars | Unknown | SmartCRM integration | Unknown |
| smartcrm-documents | Unknown | SmartCRM integration | Unknown |
| app-assets | Unknown | Application assets | Unknown |
| user-uploads | Unknown | User uploads | Likely `src/lib/storage.ts` |
| training-videos | Unknown | Training videos | Unknown |
| webinar-replays | Unknown | Webinar replays | Unknown |
| generated-images | Unknown | Generated images | Unknown |
| generated-thumbnails | Unknown | Generated thumbnails | Unknown |
| remix-media-assets | Unknown | Remix media | Unknown |
| remix-user-uploads | Unknown | Remix uploads | Unknown |
| presentation-images | Unknown | Presentation images | Unknown |
| campaign-videos | Unknown | Campaign videos | Unknown |
| generated-media | Unknown | Generated media | Unknown |
| brand-assets | Unknown | Brand assets | Unknown |
| tenant-assets | Unknown | Tenant assets | Unknown |
| tenant-generations | Unknown | Tenant generations | Unknown |
| tenant-thumbnails | Unknown | Tenant thumbnails | Unknown |
| shared-content | Unknown | Shared content | Unknown |
| frame-media | Unknown | Frame media | Unknown |
| pomelli-assets | Unknown | Pomelli assets | Unknown |
| campaign-images | Unknown | Campaign images | Unknown |
| user-assets | Unknown | User assets | Unknown |
| campaign-audio | Unknown | Campaign audio | Unknown |
| videco-videos | Unknown | Videco videos | Unknown |
| brand-photoshoots | Unknown | Brand photoshoots | Unknown |
| vfx-uploads | Unknown | VFX uploads | Unknown |
| thumbnails | Unknown | Thumbnails | Unknown |
| card-avatars | Unknown | Card avatars | Unknown |
| template-thumbnails | Unknown | Template thumbnails | Unknown |
| recordings | Unknown | Recordings | Unknown |
| uploads | Unknown | General uploads | Unknown |
| brander_user-profiles | Unknown | Brander profiles | Unknown |
| brander_generated-assets | Unknown | Brander generated assets | Unknown |
| brander_brand-assets | Unknown | Brander brand assets | Unknown |
| brander_user-uploads | Unknown | Brander user uploads | Unknown |

**Total buckets:** 43

---

## Code References

From `src/lib/storage.ts` (based on Phase 4 inspection):

* `user-uploads` bucket is referenced in application code
* `SUPABASE_STORAGE_BUCKET=user-uploads` in `.env.local`

---

## Gaps

1. **Public/private status** - Cannot determine for each bucket
2. **File size limits** - Cannot determine
3. **Allowed MIME types** - Cannot determine
4. **Path structure** - Cannot determine upload path patterns
5. **Bucket policies** - Cannot determine RLS for storage

---

## Recommendation

Use Supabase Studio to inspect:
* Bucket privacy settings
* Storage policies
* File counts and sizes
* Path patterns
