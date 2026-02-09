import { Role, RoleCategory } from "./types";
import { User, Briefcase, Landmark, Shield, AlertTriangle, Heart, Eye } from "lucide-react";
import React from "react";

// 1. Map specific Roles (Titles) to Broad Categories
export const getRoleCategory = (role: Role): RoleCategory => {
  const r = role.toLowerCase();

  // Law Enforcement (Check first as 'Police Commissioner' contains 'Commissioner')
  if (['police', 'crime', 'hawks', 'private investigator', 'informant'].some(k => r.includes(k))) return 'law_enforcement';

  // Political
  if (['minister', 'parliament', 'delegate', 'fixer', 'gov_official'].some(k => r.includes(k))) return 'political';

  // Official Roles (Generic check last)
  if (['commissioner', 'chairperson', 'investigator', 'legal counsel', 'clerk', 'official'].some(k => r.includes(k))) return 'official';

  // Witness
  if (['witness', 'whistleblower'].some(k => r.includes(k))) return 'witness';

  // Suspects / Accused
  if (['suspect', 'crime boss', 'associate', 'accused', 'enabler'].some(k => r.includes(k))) return 'suspect';

  // Victims
  if (['victim', 'target'].some(k => r.includes(k))) return 'victim';

  // Business
  if (['business', 'holding', 'corp', 'company', 'subsidiary'].some(k => r.includes(k))) return 'business';

  // Civilians / Others (Fallback)
  return 'civilian';
};

// 2. Styling Config for Categories
export const getRoleStyle = (category: RoleCategory) => {
  switch (category) {
    case 'official':
      return {
        bg: 'bg-amber-100', text: 'text-amber-700', 
        border: 'border-amber-200', ring: 'ring-amber-500/20',
        iconColor: 'text-amber-600',
        badgeBg: 'bg-amber-50', badgeText: 'text-amber-800',
        minmap: '#f59e0b',
        solidBg: 'bg-amber-500' 
      };
    case 'law_enforcement':
      return {
        bg: 'bg-blue-100', text: 'text-blue-700',
        border: 'border-blue-200', ring: 'ring-blue-500/20',
        iconColor: 'text-blue-600',
        badgeBg: 'bg-blue-50', badgeText: 'text-blue-800',
        minmap: '#3b82f6',
        solidBg: 'bg-blue-500'
      };
    case 'political':
      return { // Using Emerald/Green for Gov
        bg: 'bg-emerald-100', text: 'text-emerald-700',
        border: 'border-emerald-200', ring: 'ring-emerald-500/20',
        iconColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-800',
        minmap: '#10b981',
        solidBg: 'bg-emerald-500'
      };
    case 'witness':
      return {
        bg: 'bg-teal-100', text: 'text-teal-700',
        border: 'border-teal-200', ring: 'ring-teal-500/20',
        iconColor: 'text-teal-600',
        badgeBg: 'bg-teal-50', badgeText: 'text-teal-800',
        minmap: '#14b8a6',
        solidBg: 'bg-teal-500'
      };
    case 'suspect':
      return {
        bg: 'bg-rose-100', text: 'text-rose-700',
        border: 'border-rose-200', ring: 'ring-rose-500/20',
        iconColor: 'text-rose-600',
        badgeBg: 'bg-rose-50', badgeText: 'text-rose-800',
        minmap: '#f43f5e',
        solidBg: 'bg-rose-500'
      };
    case 'victim':
      return {
        bg: 'bg-pink-100', text: 'text-pink-700',
        border: 'border-pink-200', ring: 'ring-pink-500/20',
        iconColor: 'text-pink-600',
        badgeBg: 'bg-pink-50', badgeText: 'text-pink-800',
        minmap: '#ec4899',
        solidBg: 'bg-pink-500'
      };
    case 'business':
      return {
        bg: 'bg-sky-100', text: 'text-sky-700',
        border: 'border-sky-200', ring: 'ring-sky-500/20',
        iconColor: 'text-sky-600',
        badgeBg: 'bg-sky-50', badgeText: 'text-sky-800',
        minmap: '#0ea5e9',
        solidBg: 'bg-sky-500'
      };
    case 'civilian':
    default:
      return {
        bg: 'bg-slate-100', text: 'text-slate-700',
        border: 'border-slate-200', ring: 'ring-slate-500/20',
        iconColor: 'text-slate-600',
        badgeBg: 'bg-slate-50', badgeText: 'text-slate-800',
        minmap: '#64748b',
        solidBg: 'bg-slate-500'
      };
  }
};

// 3. Icon Mapping
export const getRoleIcon = (category: RoleCategory, size = 14) => {
  const props = { size };
  switch (category) {
    case 'official': return <Briefcase {...props} />;
    case 'law_enforcement': return <Shield {...props} />;
    case 'political': return <Landmark {...props} />;
    case 'witness': return <Eye {...props} />;
    case 'suspect': return <AlertTriangle {...props} />;
    case 'victim': return <Heart {...props} />;
    case 'business': return <Briefcase {...props} />; // Or building
    case 'civilian': 
    default: return <User {...props} />;
  }
};
