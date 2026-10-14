import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ListChecks, Scale, CalendarClock, FileCheck, Upload,
  Lock, Users, FileUp, ScanText, BadgeCheck, FileDown, BookOpen,
  Gavel, Library, Quote, SlidersHorizontal, Mic, Search,
  ArrowLeftRight, ArrowRightLeft, Undo2, ArrowRight
} from 'lucide-react';
import { NavMenuConfigItem, NavMenuItem } from '../config/navMenuConfig';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  ListChecks,
  Scale,
  CalendarClock,
  FileCheck,
  Upload,
  Lock,
  Users,
  FileUp,
  ScanText,
  BadgeCheck,
  FileDown,
  BookOpen,
  Gavel,
  Library,
  Quote,
  SlidersHorizontal,
  Mic,
  Search,
  ArrowLeftRight,
  ArrowRightLeft,
  Undo2,
};

interface MegaMenuPanelProps {
  config: NavMenuConfigItem;
  triggerRect: DOMRect | null;
  onClose: () => void;
  prefersReducedMotion: boolean;
}

export const MegaMenuPanel: React.FC<MegaMenuPanelProps> = ({
  config,
  triggerRect,
  onClose,
  prefersReducedMotion,
}) => {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; notchLeft: number }>({
    left: 0,
    top: 74,
    notchLeft: 50,
  });

  const panelWidth = config.width === 'one-column' ? 420 : 640;

  useEffect(() => {
    if (!triggerRect) return;

    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const idealLeft = triggerCenter - panelWidth / 2;
    const minMargin = 16;
    const maxLeft = window.innerWidth - panelWidth - minMargin;
    const clampedLeft = Math.max(minMargin, Math.min(maxLeft, idealLeft));
    const notchOffset = triggerCenter - clampedLeft;

    setPosition({
      left: clampedLeft,
      top: triggerRect.bottom + 10,
      notchLeft: Math.max(20, Math.min(panelWidth - 20, notchOffset)),
    });
  }, [triggerRect, panelWidth]);

  // Keyboard navigation inside panel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[role="menuitem"], button[role="menuitem"]'
      );
      if (!focusable || focusable.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const index = Array.from(focusable).indexOf(activeElement);

      if (e.key === 'ArrowDown') {
        const nextIndex = index < focusable.length - 1 ? index + 1 : 0;
        focusable[nextIndex]?.focus();
      } else {
        const prevIndex = index > 0 ? index - 1 : focusable.length - 1;
        focusable[prevIndex]?.focus();
      }
    }
  };

  const renderMenuItem = (item: NavMenuItem, idx: number) => {
    const IconComponent = item.iconName ? iconMap[item.iconName] : null;

    if (item.isLegend) {
      return (
        <div
          key={idx}
          className="flex items-start gap-3.5 p-2.5 rounded-xl select-none"
        >
          <div
            className="w-4 h-4 rounded-[4px] shrink-0 mt-0.5 shadow-xs"
            style={{ backgroundColor: item.badgeColor }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-sans text-[14px] font-semibold text-[#0B1F3A]">
              {t(item.titleKey)}
            </h4>
            <p className="font-sans text-[12px] text-[#5B6577] line-clamp-2 leading-relaxed mt-0.5">
              {t(item.descKey)}
            </p>
          </div>
        </div>
      );
    }

    return (
      <Link
        key={idx}
        to={item.to || config.path}
        role="menuitem"
        onClick={onClose}
        className="group relative flex items-start gap-3.5 p-2.5 rounded-xl transition-all hover:bg-[#F8F5EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
      >
        {/* 3px gold left accent */}
        <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#C9A227] rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* 40px Icon tile */}
        <div className="w-10 h-10 rounded-lg bg-[#F8F5EE] border border-[#E4DED0] flex items-center justify-center shrink-0 text-[#0B1F3A] group-hover:bg-[#0B1F3A] group-hover:text-[#C9A227] group-hover:border-[#0B1F3A] transition-all">
          {IconComponent && <IconComponent className="w-5 h-5" />}
        </div>

        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-sans text-[15px] font-semibold text-[#0B1F3A] group-hover:text-[#0B1F3A] transition-colors leading-tight">
              {t(item.titleKey)}
            </h4>
            <ArrowRight className="w-3.5 h-3.5 text-[#C9A227] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
          </div>
          <p className="font-sans text-[13px] text-[#5B6577] line-clamp-2 leading-relaxed mt-0.5">
            {t(item.descKey)}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <motion.div
      ref={panelRef}
      id={`mega-menu-${config.id}`}
      role="menu"
      aria-label={t(config.labelKey)}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${panelWidth}px`,
      }}
      className="fixed z-50 bg-white border border-[#E4DED0] rounded-[16px] shadow-[0_20px_50px_rgba(11,31,58,0.25)] p-6 flex flex-col max-h-[80vh] overflow-hidden focus:outline-none"
    >
      {/* Rotated Connecting Notch */}
      <div
        className="w-2.5 h-2.5 rotate-45 bg-white border-t border-l border-[#E4DED0] absolute -top-[6px] pointer-events-none"
        style={{ left: `${position.notchLeft}px` }}
      />

      {/* Main Content Columns */}
      <div className="overflow-y-auto pr-1 flex-1">
        <div
          className={`grid gap-6 ${
            config.columns.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {config.columns.map((col, colIdx) => (
            <div key={colIdx} className="space-y-1">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#5B6577] font-semibold mb-4 pl-2.5">
                {t(col.headingKey)}
              </h3>
              <div className="space-y-1">
                {col.items.map((item, itemIdx) => (
                  <motion.div
                    key={itemIdx}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.15,
                      delay: prefersReducedMotion ? 0 : (colIdx * col.items.length + itemIdx) * 0.025,
                    }}
                  >
                    {renderMenuItem(item, itemIdx)}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prominent Footer Strip */}
      <div className="border-t border-[#E4DED0] bg-[#F8F5EE] px-6 py-3.5 flex items-center justify-between gap-4 -mx-6 -mb-6 mt-5 shrink-0">
        <Link
          to={config.footer.to}
          role="menuitem"
          onClick={onClose}
          className="text-[#0B1F3A] font-semibold text-[13px] hover:text-[#C9A227] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold rounded px-1"
        >
          <span>{t(config.footer.labelKey)}</span>
        </Link>
        <span className="text-[12px] text-[#5B6577] select-none text-right">
          {t(config.footer.hintKey)}
        </span>
      </div>
    </motion.div>
  );
};
