import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/**
 * MediChain Supabase Storage Service
 * 
 * Manages production-ready file uploads and security routing for:
 * 1. "verification-documents" - A private bucket for sensitive DGDA Drug Licenses, Trade Licenses & NID files.
 * 2. "prescriptions" - A private bucket for HIPAA/DGDA compliant prescription/order lists.
 * 3. "product-images" - A public bucket for administrator catalog product images.
 */
export const storageService = {
  /**
   * Validate file size, mime types, and file extensions
   */
  validateFile(file: File, allowedTypes: string[], maxSizeBytes: number, allowedExtensions?: string[]) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isMimeAllowed = allowedTypes.includes(file.type);
    const isExtAllowed = allowedExtensions ? allowedExtensions.includes(ext) : false;

    if (!isMimeAllowed && !isExtAllowed) {
      throw new Error(
        `Unsupported file type: ${file.type || ext || "unknown"}. Supported formats: ${allowedExtensions?.join(", ") || allowedTypes.join(", ")}.`
      );
    }
    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is ${maxMb} MB.`);
    }
  },

  /**
   * Upload a sensitive pharmacy verification document to the private "verification-documents" bucket
   * Folder structure: {pharmacyId}/{docType}/{timestamp}_{filename}
   */
  async uploadVerificationDocument(
    file: File,
    pharmacyIdOrUserId: string,
    docType: "drug-license" | "trade-license" | "proprietor-nid"
  ): Promise<{ path: string; url: string }> {
    // Validate: Support JPG, PNG, WEBP, HEIC, HEIF, PDF; Max size 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/pdf"
    ];
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    this.validateFile(file, allowedTypes, maxSize, allowedExtensions);

    if (isSupabaseConfigured) {
      try {
        let resolvedId = pharmacyIdOrUserId;
        if (!resolvedId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error("Authentication session required to upload verification document.");
          }
          resolvedId = user.id;
        }

        const fileExt = file.name.split(".").pop() || "png";
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const cleanFileName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `${resolvedId}/${docType}/${Date.now()}_${cleanFileName}.${fileExt}`;

        const { error } = await supabase.storage
          .from("verification-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (error) {
          throw new Error(`Supabase Verification Document upload failed: ${error.message}`);
        }

        // Retrieve private signed URL (1 hour expiry) for authenticated preview/download
        const signedUrl = await this.getVerificationDocumentUrl(path, 3600);

        return { path, url: signedUrl };
      } catch (err: any) {
        throw new Error(err.message || "An error occurred during verification document upload.");
      }
    } else {
      // Local sandbox mock fallback: read file to local URL
      console.warn("Using offline fallback storage for verification document upload.");
      const mockPath = `offline_verification/${pharmacyIdOrUserId || "anonymous"}/${docType}/${Date.now()}_${file.name}`;
      const mockUrl = URL.createObjectURL(file);
      return { path: mockPath, url: mockUrl };
    }
  },

  /**
   * Retrieves a signed access URL for private files in the "verification-documents" bucket
   */
  async getVerificationDocumentUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(path, expiresInSeconds);

      if (error || !data?.signedUrl) {
        throw new Error(`Failed to generate signed url: ${error?.message || "empty response"}`);
      }
      return data.signedUrl;
    }
    // Sandbox fallback
    return path.startsWith("offline_") ? path : `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400`;
  },

  /**
   * Upload a pharmacy prescription sheet to the private "prescriptions" bucket
   * Partitioned securely by user ID: prescriptions/{userId}/{timestamp}_{filename}
   */
  async uploadPrescription(file: File, userId?: string): Promise<{ path: string; url: string }> {
    // Standard validation: Support JPG, PNG, PDF; Max size 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    const maxSize = 10 * 1024 * 1024; // 10 MB
    this.validateFile(file, allowedTypes, maxSize, allowedExtensions);

    if (isSupabaseConfigured) {
      try {
        let resolvedUserId = userId;
        if (!resolvedUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error("Authentication session required to upload prescription.");
          }
          resolvedUserId = user.id;
        }

        const fileExt = file.name.split(".").pop() || "png";
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const cleanFileName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `${resolvedUserId}/${Date.now()}_${cleanFileName}.${fileExt}`;

        const { error } = await supabase.storage
          .from("prescriptions")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (error) {
          throw new Error(`Supabase Storage upload failed: ${error.message}`);
        }

        // Retrieve private signed URL for direct view/download access
        const signedUrl = await this.getPrescriptionUrl(path);

        return { path, url: signedUrl };
      } catch (err: any) {
        throw new Error(err.message || "An error occurred during prescription upload.");
      }
    } else {
      // Local sandbox mock fallback: read file to local URL
      console.warn("Using offline fallback storage for prescription upload.");
      const mockPath = `offline_prescriptions/${userId || "anonymous"}/${Date.now()}_${file.name}`;
      const mockUrl = URL.createObjectURL(file);
      return { path: mockPath, url: mockUrl };
    }
  },

  /**
   * Retrieves a signed access URL for private files in the "prescriptions" bucket
   */
  async getPrescriptionUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.storage
        .from("prescriptions")
        .createSignedUrl(path, expiresInSeconds);

      if (error || !data?.signedUrl) {
        throw new Error(`Failed to generate signed url: ${error?.message || "empty response"}`);
      }
      return data.signedUrl;
    }
    // Sandbox fallback
    return path.startsWith("offline_") ? path : `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400`;
  },

  /**
   * Upload an administrator catalog image to the public "product-images" bucket
   */
  async uploadProductImage(file: File): Promise<{ path: string; url: string }> {
    // Validate: Support JPG, PNG; Max size 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const maxSize = 5 * 1024 * 1024; // 5 MB
    this.validateFile(file, allowedTypes, maxSize, allowedExtensions);

    if (isSupabaseConfigured) {
      try {
        const fileExt = file.name.split(".").pop() || "png";
        const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const cleanFileName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `products/${Date.now()}_${cleanFileName}.${fileExt}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, {
            cacheControl: "31536000", // Cache publicly for a year
            upsert: true
          });

        if (error) {
          throw new Error(`Supabase Product Storage upload failed: ${error.message}`);
        }

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        if (!data?.publicUrl) {
          throw new Error("Failed to retrieve public product image URL.");
        }

        return { path, url: data.publicUrl };
      } catch (err: any) {
        throw new Error(err.message || "An error occurred during product image upload.");
      }
    } else {
      // Local sandbox mock fallback
      const mockPath = `offline_products/${Date.now()}_${file.name}`;
      const mockUrl = URL.createObjectURL(file);
      return { path: mockPath, url: mockUrl };
    }
  },

  /**
   * Delete a file from any bucket
   */
  async deleteFile(bucket: "prescriptions" | "product-images" | "verification-documents", path: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        throw new Error(`Failed to delete file from storage: ${error.message}`);
      }
    } else {
      console.log(`Mock file deletion from ${bucket}: ${path}`);
    }
  }
};
