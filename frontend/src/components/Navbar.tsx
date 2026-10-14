import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Home, FileText, CheckCircle2, MessageSquare, BookOpen,
  ArrowRightLeft, ArrowLeftRight, Settings, Shield, ShieldAlert, Globe, Menu, X,
  LogOut, ChevronDown, ArrowRight, Undo2, Users, Lock, Upload,
  FileCheck, CalendarClock, ScanText, BadgeCheck, FileDown,
  Gavel, Library, Quote, SlidersHorizontal, Mic, Search, FileUp,
  ShieldCheck, ListChecks
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navMenuConfigs, NavMenuConfigItem } from '../config/navMenuConfig';
import { MegaMenuPanel } from './MegaMenuPanel';

// Icon lookup for mobile accordion items
const mobileIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck, ListChecks, Scale, CalendarClock, FileCheck, Upload,
  Lock, Users, FileUp, ScanText, BadgeCheck, FileDown, BookOpen,
  Gavel, Library, Quote, SlidersHorizontal, Mic, Search,
  ArrowLeftRight, ArrowRightLeft, Undo2, Home, FileText, CheckCircle2, MessageSquare,
  Settings,
};

interface NavbarProps {
  privacyMode: boolean;
  onTogglePrivacy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  privacyMode,
  onTogglePrivacy,
}) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordionId, setMobileAccordionId] = useState<string | null>(null);

  // Mega-menu and hover states
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLElement | null>>({});

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Update trigger rect when active dropdown changes or on scroll
  useEffect(() => {
    if (activeDropdownId && triggerRefs.current[activeDropdownId]) {
      setTriggerRect(triggerRefs.current[activeDropdownId]!.getBoundingClientRect());
    } else {
      setTriggerRect(null);
    }
  }, [activeDropdownId]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      if (activeDropdownId && triggerRefs.current[activeDropdownId]) {
        setTriggerRect(triggerRefs.current[activeDropdownId]!.getBoundingClientRect());
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeDropdownId]);

  // Close dropdown on window resize below 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setActiveDropdownId(null);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = desktopDropdownRef.current?.contains(target);
      const isInsideMobile = mobileDropdownRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !(event.target as HTMLElement).closest('[data-mobile-toggle]')
      ) {
        setIsMobileMenuOpen(false);
      }
      if (
        activeDropdownId &&
        navContainerRef.current &&
        !navContainerRef.current.contains(target) &&
        !(event.target as HTMLElement).closest(`#mega-menu-${activeDropdownId}`)
      ) {
        setActiveDropdownId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDropdownId && triggerRefs.current[activeDropdownId]) {
          triggerRefs.current[activeDropdownId]?.focus();
        }
        setIsDropdownOpen(false);
        setIsMobileMenuOpen(false);
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdownId]);

  // Close all menus on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setActiveDropdownId(null);
    setHoveredNavId(null);
  }, [location.pathname]);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setActiveDropdownId(null);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/signin', { replace: true });
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const toggleDropdown = (id: string) => {
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
    } else {
      setActiveDropdownId(id);
    }
  };

  const handleNavMouseEnter = (id: string) => {
    setHoveredNavId(id);
    // If a mega-menu panel is already open, hover over another dropdown item switches panel directly
    if (activeDropdownId && id !== 'home') {
      setActiveDropdownId(id);
    }
  };

  const handleNavMouseLeave = () => {
    setHoveredNavId(null);
  };

  // Nav item list definition
  const navItems = [
    { id: 'home', to: '/', label: t('nav.landing'), hasDropdown: false },
    { id: 'workspace', to: '/workspace', label: t('nav.workspace'), hasDropdown: true },
    { id: 'audit', to: '/audit', label: t('nav.audit'), hasDropdown: true },
    { id: 'agent', to: '/agent', label: t('nav.agent'), hasDropdown: true },
    { id: 'library', to: '/library', label: t('nav.library'), hasDropdown: true },
    { id: 'converter', to: '/converter', label: t('nav.converter'), hasDropdown: true },
  ];

  const activeMenuConfig = navMenuConfigs.find((c) => c.id === activeDropdownId);
  const activeTargetId = activeDropdownId || hoveredNavId;

  return (
    <div className="w-full shrink-0">
      {/* Main Navbar: Full-width edge-to-edge, sticky at top-0, 64px, navy #0B1F3A at 95% */}
      <header
        className={`sticky top-0 z-40 w-full h-16 bg-[#0B1F3A]/95 backdrop-blur-md border-b border-white/[0.08] transition-shadow duration-200 ${
          isScrolled ? 'shadow-[0_4px_24px_rgba(0,0,0,0.3)]' : ''
        }`}
      >
        <div className="max-w-[1440px] mx-auto h-full px-6 xl:px-8 grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-center">
          {/* LEFT: Logo Mark + NyayaLens Wordmark */}
          <div className="flex items-center justify-start">
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold rounded-lg group"
              aria-label="NyayaLens Home"
            >
              <div className="w-8 h-8 rounded-lg bg-nyaya-navy700 flex items-center justify-center text-nyaya-gold border border-nyaya-gold/30 shrink-0 group-hover:border-nyaya-gold/60 transition-colors">
                <Scale className="w-4 h-4" />
              </div>
              <span className="font-serif text-[20px] font-bold text-white tracking-tight leading-none">
                NyayaLens
              </span>
            </Link>
          </div>

          {/* CENTER: Desktop Navigation (1024px+) with Hover Dimming & Scaling */}
          <nav
            ref={navContainerRef}
            onMouseLeave={handleNavMouseLeave}
            className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 h-full"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const isCurrentRoute =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              const isOpen = activeDropdownId === item.id;
              const isHighlighted = activeTargetId === item.id;
              const isDimmed = activeTargetId !== null && !isHighlighted;

              const springTransition = prefersReducedMotion
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 500, damping: 30 };

              // Base item content
              const itemContent = (
                <span className="flex items-center gap-1.5 leading-none">
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.hasDropdown && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-nyaya-gold' : 'text-white/60'
                      }`}
                    />
                  )}
                </span>
              );

              // Classes for scaling, highlight and dimming
              const buttonClasses = `relative h-10 px-2.5 xl:px-3 py-1.5 rounded-lg text-[14px] xl:text-[15px] font-medium whitespace-nowrap origin-center flex items-center justify-center transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold ${
                isHighlighted
                  ? `z-20 text-white font-semibold bg-white/[0.10] border border-white/[0.20] shadow-[0_0_0_1px_rgba(201,162,39,0.35)] ${
                      !prefersReducedMotion ? 'scale-[1.08]' : ''
                    }`
                  : isDimmed
                  ? 'opacity-50 text-white/80 scale-100 z-10'
                  : 'opacity-100 text-white/80 hover:text-white scale-100 z-10'
              }`;

              if (!item.hasDropdown) {
                return (
                  <NavLink
                    key={item.id}
                    ref={(el) => (triggerRefs.current[item.id] = el)}
                    to={item.to}
                    end
                    onMouseEnter={() => handleNavMouseEnter(item.id)}
                    className={buttonClasses}
                    style={{ transformOrigin: 'center' }}
                  >
                    {itemContent}
                    {/* Active route 2px gold underline bar under item */}
                    {isCurrentRoute && !isHighlighted && (
                      <span className="absolute -bottom-[12px] left-1 right-1 h-[2px] bg-[#C9A227] rounded-full" />
                    )}
                  </NavLink>
                );
              }

              return (
                <button
                  key={item.id}
                  ref={(el) => (triggerRefs.current[item.id] = el)}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? `mega-menu-${item.id}` : undefined}
                  onClick={() => toggleDropdown(item.id)}
                  onMouseEnter={() => handleNavMouseEnter(item.id)}
                  className={buttonClasses}
                  style={{ transformOrigin: 'center' }}
                >
                  {itemContent}
                  {/* Active route 2px gold underline bar under item */}
                  {isCurrentRoute && !isHighlighted && (
                    <span className="absolute -bottom-[12px] left-1 right-1 h-[2px] bg-[#C9A227] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* RIGHT: Desktop Outlined Pill Buttons (1024px+) */}
          <div className="hidden lg:flex items-center justify-end gap-[10px]">
            {/* Privacy Toggle Pill */}
            <button
              onClick={onTogglePrivacy}
              className="h-[36px] px-3.5 rounded-full border border-white/[0.28] bg-transparent text-white text-xs font-medium flex items-center gap-1.5 hover:bg-white/[0.10] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
              title={
                privacyMode
                  ? 'Privacy Mode Active (PII Redacted)'
                  : 'Standard Mode (PII Retained)'
              }
              aria-label={privacyMode ? 'Privacy Mode Active' : 'Privacy Mode Inactive'}
            >
              {privacyMode ? (
                <Shield className="w-3.5 h-3.5 text-nyaya-gold shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-white/70 shrink-0" />
              )}
              <span className="whitespace-nowrap">
                {privacyMode ? 'Privacy: ON' : 'Privacy: OFF'}
              </span>
              {privacyMode && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] shrink-0" />
              )}
            </button>

            {/* Language Switcher Pill Group */}
            <div className="h-[36px] border border-white/[0.28] rounded-full p-[2px] flex items-center bg-transparent shrink-0">
              <Globe className="w-3.5 h-3.5 text-white/60 ml-2 mr-1 hidden xl:block" />
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nyaya-gold ${
                  i18n.language === 'en'
                    ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nyaya-gold ${
                  i18n.language === 'hi'
                    ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => handleLanguageChange('mr')}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nyaya-gold ${
                  i18n.language === 'mr'
                    ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                मराठी
              </button>
            </div>

            {/* User Avatar Circle and Profile Dropdown */}
            {user && (
              <div className="relative shrink-0" ref={desktopDropdownRef}>
                <button
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setIsMobileMenuOpen(false);
                    setActiveDropdownId(null);
                  }}
                  className="w-[36px] h-[36px] rounded-full bg-nyaya-navy700 text-[#C9A227] border border-white/[0.28] hover:border-[#C9A227] flex items-center justify-center text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
                  aria-label="User account menu"
                  aria-expanded={isDropdownOpen}
                >
                  {user.is_guest
                    ? 'G'
                    : user.name
                    ? user.name.trim().charAt(0).toUpperCase()
                    : 'U'}
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-card border border-nyaya-border shadow-elevated p-3 z-50 text-xs space-y-2 animate-in fade-in"
                    >
                      <div className="border-b border-nyaya-border/60 pb-2">
                        <p className="font-semibold text-nyaya-navy900 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-nyaya-muted truncate">
                          {user.is_guest ? t('auth.guest', 'Guest') : user.email}
                        </p>
                      </div>

                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-nyaya-navy900 hover:bg-nyaya-ivory font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
                      >
                        <Settings className="w-3.5 h-3.5 text-nyaya-muted" />
                        <span>{t('nav.settings', 'Settings & Privacy')}</span>
                      </Link>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleSignOut();
                        }}
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-nyaya-notSupported hover:bg-nyaya-notSupportedBg font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('auth.sign_out', 'Sign out')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* TABLET & MOBILE (<1024px): Hamburger & Avatar */}
          <div className="flex lg:hidden items-center justify-end gap-2.5">
            <button
              data-mobile-toggle
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
                setIsDropdownOpen(false);
                setActiveDropdownId(null);
              }}
              className="p-2 text-white hover:bg-white/[0.10] rounded-lg border border-white/[0.18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
              aria-label={t('nav.toggle_menu', 'Toggle navigation menu')}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>

            {user && (
              <div className="relative shrink-0" ref={mobileDropdownRef}>
                <button
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-[36px] h-[36px] rounded-full bg-nyaya-navy700 text-[#C9A227] border border-white/[0.28] hover:border-[#C9A227] flex items-center justify-center text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
                  aria-label="User account menu"
                  aria-expanded={isDropdownOpen}
                >
                  {user.is_guest
                    ? 'G'
                    : user.name
                    ? user.name.trim().charAt(0).toUpperCase()
                    : 'U'}
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-card border border-nyaya-border shadow-elevated p-3 z-50 text-xs space-y-2 animate-in fade-in"
                    >
                      <div className="border-b border-nyaya-border/60 pb-2">
                        <p className="font-semibold text-nyaya-navy900 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-nyaya-muted truncate">
                          {user.is_guest ? t('auth.guest', 'Guest') : user.email}
                        </p>
                      </div>

                      <Link
                        to="/settings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-nyaya-navy900 hover:bg-nyaya-ivory font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold"
                      >
                        <Settings className="w-3.5 h-3.5 text-nyaya-muted" />
                        <span>{t('nav.settings', 'Settings & Privacy')}</span>
                      </Link>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleSignOut();
                        }}
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-nyaya-notSupported hover:bg-nyaya-notSupportedBg font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nyaya-gold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('auth.sign_out', 'Sign out')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-Down Menu Sheet with Accordions (<1024px) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full left-0 right-0 w-full bg-[#0B1F3A] border-b border-white/[0.12] shadow-elevated p-4 z-50 lg:hidden flex flex-col gap-1 max-h-[calc(100vh-64px)] overflow-y-auto"
            >
              {/* Home Link */}
              <NavLink
                to="/"
                end
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.20]'
                      : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
                  }`
                }
              >
                <Home className="w-4 h-4 text-nyaya-gold shrink-0" />
                <span className="flex-1 whitespace-nowrap">{t('nav.landing')}</span>
              </NavLink>

              {/* Accordion Menu Sections for the 5 Dropdown Items */}
              {navMenuConfigs.map((menuConfig) => {
                const isExpanded = mobileAccordionId === menuConfig.id;
                const RootIcon = mobileIconMap[menuConfig.columns[0]?.items[0]?.iconName || 'FileText'] || FileText;

                return (
                  <div key={menuConfig.id} className="rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setMobileAccordionId(isExpanded ? null : menuConfig.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] text-sm font-medium text-white/90 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <RootIcon className="w-4 h-4 text-nyaya-gold shrink-0" />
                        <span className="font-semibold">{t(menuConfig.labelKey)}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-nyaya-gold' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-[#07152A]/60 px-3 pb-3 pt-1 border-t border-white/[0.06]"
                        >
                          <div className="space-y-1">
                            {menuConfig.columns.flatMap((col) => col.items).map((item, itemIdx) => {
                              const ItemIcon = item.iconName ? mobileIconMap[item.iconName] : null;

                              if (item.isLegend) {
                                return (
                                  <div key={itemIdx} className="flex items-center gap-3 px-3 py-2 text-xs text-white/70">
                                    <div
                                      className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                                      style={{ backgroundColor: item.badgeColor }}
                                    />
                                    <div>
                                      <p className="font-semibold text-white/90">{t(item.titleKey)}</p>
                                      <p className="text-[11px] text-white/60">{t(item.descKey)}</p>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={itemIdx}
                                  to={item.to || menuConfig.path}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.08] transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-md bg-white/[0.08] flex items-center justify-center shrink-0 text-nyaya-gold">
                                    {ItemIcon && <ItemIcon className="w-4 h-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <p className="text-xs font-semibold text-white group-hover:text-nyaya-gold transition-colors">
                                        {t(item.titleKey)}
                                      </p>
                                      <ArrowRight className="w-3 h-3 text-nyaya-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-[11px] text-white/60 line-clamp-1">{t(item.descKey)}</p>
                                  </div>
                                </Link>
                              );
                            })}

                            {/* Section Footer Link */}
                            <div className="pt-2 mt-1 border-t border-white/[0.08] flex items-center justify-between">
                              <Link
                                to={menuConfig.footer.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-xs font-semibold text-nyaya-gold hover:underline flex items-center gap-1"
                              >
                                {t(menuConfig.footer.labelKey)}
                              </Link>
                              <span className="text-[10px] text-white/40">{t(menuConfig.footer.hintKey)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Settings & Privacy Link */}
              <NavLink
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.20]'
                      : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
                  }`
                }
              >
                <Settings className="w-4 h-4 text-nyaya-gold shrink-0" />
                <span className="flex-1 whitespace-nowrap">{t('nav.settings')}</span>
              </NavLink>

              {/* Mobile Sign out Link */}
              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium text-nyaya-notSupported hover:bg-nyaya-notSupportedBg transition-colors w-full text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="flex-1 whitespace-nowrap">{t('auth.sign_out', 'Sign out')}</span>
                </button>
              )}

              <div className="my-2 border-t border-white/[0.10]" />

              {/* Mobile Privacy Toggle & Language Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <button
                  onClick={onTogglePrivacy}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 min-h-[48px] rounded-full border border-white/[0.28] text-white text-xs font-medium hover:bg-white/[0.10] transition-colors"
                >
                  {privacyMode ? (
                    <Shield className="w-4 h-4 text-nyaya-gold shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-white/70 shrink-0" />
                  )}
                  <span>
                    {privacyMode
                      ? 'Privacy Mode: ON (PII Redacted)'
                      : 'Privacy Mode: OFF'}
                  </span>
                  {privacyMode && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] shrink-0" />
                  )}
                </button>

                <div className="flex items-center justify-center gap-1 border border-white/[0.28] rounded-full p-1.5 min-h-[48px]">
                  <Globe className="w-4 h-4 text-white/60 mx-1" />
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs transition-colors ${
                      i18n.language === 'en'
                        ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => handleLanguageChange('hi')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs transition-colors ${
                      i18n.language === 'hi'
                        ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    onClick={() => handleLanguageChange('mr')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs transition-colors ${
                      i18n.language === 'mr'
                        ? 'bg-[#C9A227] text-[#0B1F3A] font-semibold'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    मराठी
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 3) Backdrop Overlay (rgba(11,31,58,0.30) with slight backdrop blur) */}
      <AnimatePresence>
        {activeDropdownId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setActiveDropdownId(null)}
            className="fixed inset-0 bg-[#0B1F3A]/30 backdrop-blur-xs z-30"
          />
        )}
      </AnimatePresence>

      {/* 4) Floating Mega-Menu Panel */}
      <AnimatePresence>
        {activeMenuConfig && (
          <MegaMenuPanel
            key={activeMenuConfig.id}
            config={activeMenuConfig}
            triggerRect={triggerRect}
            onClose={() => {
              if (activeDropdownId && triggerRefs.current[activeDropdownId]) {
                triggerRefs.current[activeDropdownId]?.focus();
              }
              setActiveDropdownId(null);
            }}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
