'use client';

import React from 'react';
import { CustomerDetails } from '@/types/document';
import { User, Building, MapPin, Phone, Mail } from 'lucide-react';

interface CustomerDetailsFormProps {
  customer: CustomerDetails;
  onChange: (updated: Partial<CustomerDetails>) => void;
}

export const CustomerDetailsForm: React.FC<CustomerDetailsFormProps> = ({ customer, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Client / Contact Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="customer-name"
              type="text"
              value={customer.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. John Doe, Rajesh Sharma"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Company Name (Optional)
          </label>
          <div className="relative">
            <input
              type="text"
              value={customer.company}
              onChange={(e) => onChange({ company: e.target.value })}
              placeholder="e.g. Acme Innovations Pvt Ltd"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Billing Address
        </label>
        <div className="relative">
          <textarea
            rows={2}
            value={customer.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Street address, City, State, Postal code"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
          <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={customer.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={customer.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="client@company.com"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Customer GSTIN
          </label>
          <input
            type="text"
            value={customer.gstin}
            onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })}
            placeholder="e.g. 06AACCA5678D1Z9"
            maxLength={15}
            className="w-full px-3 py-2 text-sm font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            State & Code
          </label>
          <input
            type="text"
            value={customer.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="e.g. Haryana (06)"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Place of Supply
          </label>
          <input
            type="text"
            value={customer.placeOfSupply}
            onChange={(e) => onChange({ placeOfSupply: e.target.value })}
            placeholder="e.g. Haryana (06)"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
    </div>
  );
};
