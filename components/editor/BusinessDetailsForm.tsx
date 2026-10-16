'use client';

import React, { useRef } from 'react';
import { BusinessDetails } from '@/types/document';
import { Building2, Upload, Trash2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

interface BusinessDetailsFormProps {
  business: BusinessDetails;
  onChange: (updated: Partial<BusinessDetails>) => void;
}

export const BusinessDetailsForm: React.FC<BusinessDetailsFormProps> = ({ business, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Client-side resize to max 400x400 to keep memory fast and PDF generation sharp
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL(file.type || 'image/png', 0.9);
          onChange({ logo: resizedDataUrl });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    onChange({ logo: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Logo & Basic Info */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Logo Box */}
        <div className="w-full sm:w-44 shrink-0">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Business Logo
          </label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            {business.logo ? (
              <div className="space-y-2">
                <div className="relative w-full h-20">
                  <Image
                    src={business.logo}
                    alt="Logo"
                    fill
                    className="object-contain"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-3 space-y-1.5"
              >
                <div className="w-9 h-9 mx-auto rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Upload Logo
                </span>
                <span className="block text-[10px] text-slate-400">PNG, JPG or WEBP</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Business Name and Tagline */}
        <div className="flex-1 w-full space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Business Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="business-name"
                type="text"
                value={business.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="e.g. Acme Studio, Creative Solutions"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tagline (Optional)
            </label>
            <input
              type="text"
              value={business.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
              placeholder="e.g. CREATE • CALCULATE • SHARE"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Address & City
        </label>
        <div className="relative">
          <textarea
            rows={2}
            value={business.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Office / Street address, City, State, PIN"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
          <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone
          </label>
          <div className="relative">
            <input
              type="text"
              value={business.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={business.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="billing@business.com"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Website
          </label>
          <div className="relative">
            <input
              type="text"
              value={business.website}
              onChange={(e) => onChange({ website: e.target.value })}
              placeholder="www.business.com"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Globe className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Tax Identifiers (GSTIN, PAN, State) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            GSTIN (Tax ID)
          </label>
          <input
            type="text"
            value={business.gstin}
            onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })}
            placeholder="e.g. 18AABCB1234F1Z5"
            maxLength={15}
            className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            PAN Number
          </label>
          <input
            type="text"
            value={business.pan}
            onChange={(e) => onChange({ pan: e.target.value.toUpperCase() })}
            placeholder="e.g. AABCB1234F"
            maxLength={10}
            className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            State & Code
          </label>
          <input
            type="text"
            value={business.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="e.g. Assam (18)"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  );
};
