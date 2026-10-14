export interface NavMenuItem {
  iconName?: string;
  badgeColor?: string;
  titleKey: string;
  descKey: string;
  to?: string;
  isLegend?: boolean;
}

export interface NavMenuColumn {
  headingKey: string;
  items: NavMenuItem[];
}

export interface NavMenuFooter {
  labelKey: string;
  to: string;
  hintKey: string;
}

export interface NavMenuConfigItem {
  id: string;
  labelKey: string;
  path: string;
  width: 'two-column' | 'one-column';
  columns: NavMenuColumn[];
  footer: NavMenuFooter;
}

export const navMenuConfigs: NavMenuConfigItem[] = [
  {
    id: 'workspace',
    labelKey: 'nav.workspace',
    path: '/workspace',
    width: 'two-column',
    columns: [
      {
        headingKey: 'mega_menu.headings.analyse_doc',
        items: [
          {
            iconName: 'ShieldCheck',
            titleKey: 'mega_menu.workspace.summary_title',
            descKey: 'mega_menu.workspace.summary_desc',
            to: '/workspace',
          },
          {
            iconName: 'ListChecks',
            titleKey: 'mega_menu.workspace.directions_title',
            descKey: 'mega_menu.workspace.directions_desc',
            to: '/workspace',
          },
          {
            iconName: 'Scale',
            titleKey: 'mega_menu.workspace.citations_title',
            descKey: 'mega_menu.workspace.citations_desc',
            to: '/workspace',
          },
          {
            iconName: 'CalendarClock',
            titleKey: 'mega_menu.workspace.timeline_title',
            descKey: 'mega_menu.workspace.timeline_desc',
            to: '/workspace',
          },
          {
            iconName: 'FileCheck',
            titleKey: 'mega_menu.workspace.report_title',
            descKey: 'mega_menu.workspace.report_desc',
            to: '/workspace',
          },
        ],
      },
      {
        headingKey: 'mega_menu.headings.start_here',
        items: [
          {
            iconName: 'Upload',
            titleKey: 'mega_menu.workspace.upload_title',
            descKey: 'mega_menu.workspace.upload_desc',
            to: '/workspace',
          },
          {
            iconName: 'Lock',
            titleKey: 'mega_menu.workspace.privacy_title',
            descKey: 'mega_menu.workspace.privacy_desc',
            to: '/workspace',
          },
          {
            iconName: 'Users',
            titleKey: 'mega_menu.workspace.audiences_title',
            descKey: 'mega_menu.workspace.audiences_desc',
            to: '/workspace',
          },
        ],
      },
    ],
    footer: {
      labelKey: 'mega_menu.workspace.footer_link',
      to: '/workspace',
      hintKey: 'mega_menu.workspace.footer_hint',
    },
  },
  {
    id: 'audit',
    labelKey: 'nav.audit',
    path: '/audit',
    width: 'two-column',
    columns: [
      {
        headingKey: 'mega_menu.headings.audit_doc',
        items: [
          {
            iconName: 'FileUp',
            titleKey: 'mega_menu.audit.upload_title',
            descKey: 'mega_menu.audit.upload_desc',
            to: '/audit',
          },
          {
            iconName: 'ScanText',
            titleKey: 'mega_menu.audit.extract_title',
            descKey: 'mega_menu.audit.extract_desc',
            to: '/audit',
          },
          {
            iconName: 'BadgeCheck',
            titleKey: 'mega_menu.audit.check_title',
            descKey: 'mega_menu.audit.check_desc',
            to: '/audit',
          },
          {
            iconName: 'FileDown',
            titleKey: 'mega_menu.audit.report_title',
            descKey: 'mega_menu.audit.report_desc',
            to: '/audit',
          },
        ],
      },
      {
        headingKey: 'mega_menu.headings.status_meanings',
        items: [
          {
            badgeColor: '#1F7A5C',
            titleKey: 'mega_menu.audit.status_verified_title',
            descKey: 'mega_menu.audit.status_verified_desc',
            isLegend: true,
          },
          {
            badgeColor: '#C98A00',
            titleKey: 'mega_menu.audit.status_doc_only_title',
            descKey: 'mega_menu.audit.status_doc_only_desc',
            isLegend: true,
          },
          {
            badgeColor: '#B3261E',
            titleKey: 'mega_menu.audit.status_unverified_title',
            descKey: 'mega_menu.audit.status_unverified_desc',
            isLegend: true,
          },
        ],
      },
    ],
    footer: {
      labelKey: 'mega_menu.audit.footer_link',
      to: '/audit',
      hintKey: 'mega_menu.audit.footer_hint',
    },
  },
  {
    id: 'agent',
    labelKey: 'nav.agent',
    path: '/agent',
    width: 'two-column',
    columns: [
      {
        headingKey: 'mega_menu.headings.ask_about',
        items: [
          {
            iconName: 'BookOpen',
            titleKey: 'mega_menu.agent.constitution_title',
            descKey: 'mega_menu.agent.constitution_desc',
            to: '/agent',
          },
          {
            iconName: 'Gavel',
            titleKey: 'mega_menu.agent.criminal_title',
            descKey: 'mega_menu.agent.criminal_desc',
            to: '/agent',
          },
          {
            iconName: 'Library',
            titleKey: 'mega_menu.agent.other_acts_title',
            descKey: 'mega_menu.agent.other_acts_desc',
            to: '/agent',
          },
        ],
      },
      {
        headingKey: 'mega_menu.headings.how_answers',
        items: [
          {
            iconName: 'Quote',
            titleKey: 'mega_menu.agent.sources_title',
            descKey: 'mega_menu.agent.sources_desc',
            to: '/agent',
          },
          {
            iconName: 'SlidersHorizontal',
            titleKey: 'mega_menu.agent.modes_title',
            descKey: 'mega_menu.agent.modes_desc',
            to: '/agent',
          },
          {
            iconName: 'Mic',
            titleKey: 'mega_menu.agent.voice_title',
            descKey: 'mega_menu.agent.voice_desc',
            to: '/agent',
          },
        ],
      },
    ],
    footer: {
      labelKey: 'mega_menu.agent.footer_link',
      to: '/agent',
      hintKey: 'mega_menu.agent.footer_hint',
    },
  },
  {
    id: 'library',
    labelKey: 'nav.library',
    path: '/library',
    width: 'two-column',
    columns: [
      {
        headingKey: 'mega_menu.headings.browse',
        items: [
          {
            iconName: 'BookOpen',
            titleKey: 'mega_menu.library.constitution_title',
            descKey: 'mega_menu.library.constitution_desc',
            to: '/library',
          },
          {
            iconName: 'Gavel',
            titleKey: 'mega_menu.library.criminal_title',
            descKey: 'mega_menu.library.criminal_desc',
            to: '/library',
          },
          {
            iconName: 'Library',
            titleKey: 'mega_menu.library.other_acts_title',
            descKey: 'mega_menu.library.other_acts_desc',
            to: '/library',
          },
        ],
      },
      {
        headingKey: 'mega_menu.headings.tools',
        items: [
          {
            iconName: 'Search',
            titleKey: 'mega_menu.library.search_title',
            descKey: 'mega_menu.library.search_desc',
            to: '/library',
          },
          {
            iconName: 'ArrowLeftRight',
            titleKey: 'mega_menu.library.converter_title',
            descKey: 'mega_menu.library.converter_desc',
            to: '/converter',
          },
        ],
      },
    ],
    footer: {
      labelKey: 'mega_menu.library.footer_link',
      to: '/library',
      hintKey: 'mega_menu.library.footer_hint',
    },
  },
  {
    id: 'converter',
    labelKey: 'nav.converter',
    path: '/converter',
    width: 'one-column',
    columns: [
      {
        headingKey: 'mega_menu.headings.convert',
        items: [
          {
            iconName: 'ArrowLeftRight',
            titleKey: 'mega_menu.converter.ipc_bns_title',
            descKey: 'mega_menu.converter.ipc_bns_desc',
            to: '/converter',
          },
          {
            iconName: 'ArrowLeftRight',
            titleKey: 'mega_menu.converter.crpc_bnss_title',
            descKey: 'mega_menu.converter.crpc_bnss_desc',
            to: '/converter',
          },
          {
            iconName: 'ArrowLeftRight',
            titleKey: 'mega_menu.converter.iea_bsa_title',
            descKey: 'mega_menu.converter.iea_bsa_desc',
            to: '/converter',
          },
          {
            iconName: 'Undo2',
            titleKey: 'mega_menu.converter.reverse_title',
            descKey: 'mega_menu.converter.reverse_desc',
            to: '/converter',
          },
        ],
      },
    ],
    footer: {
      labelKey: 'mega_menu.converter.footer_link',
      to: '/converter',
      hintKey: 'mega_menu.converter.footer_hint',
    },
  },
];
