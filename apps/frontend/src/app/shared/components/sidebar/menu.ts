export interface MenuItemsType {
  key: string;
  menuIcon: string;
  icon: string;
  label: string;
  showDivider: boolean;
  link?: string;
  type: 'link' | 'submenu' | 'button';
  subItems?: SubItemsType[];
}

export interface SubItemsType {
  icon: string;
  label: string;
  link?: string;
  key?: string;
  type?: 'link' | 'submenu';
  subItems?: SubItemsType[];
}

export interface MenuGroupType {
  categoryHeader?: string; // หัวข้อกลุ่มเมนู เช่น 'General', 'Feature'
  items: MenuItemsType[];
}

export const MENU_DATA: MenuGroupType[] = [
  {
    categoryHeader: 'General',
    items: [
      {
        key: 'dashboard',
        menuIcon: 'icon-home-02',
        icon: 'icon-home-02',
        label: 'Dashboard',
        link: '/dashboard',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'wallet',
        menuIcon: 'icon-wallet-01',
        icon: 'icon-wallet-01',
        label: 'MT5 & Wallet',
        link: '/mt5-wallet',
        type: 'link',
        showDivider: false,
      },
    ],
  },
  {
    categoryHeader: 'Feature',
    items: [
      {
        key: 'pip',
        menuIcon: 'icon-diamond',
        icon: 'icon-diamond',
        label: 'Pip Battle',
        link: '/pip',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'social-trade',
        menuIcon: 'icon-users-profiles-02',
        icon: 'icon-users-profiles-02',
        label: 'Social Trade',
        type: 'submenu',
        showDivider: false,
        subItems: [
          {
            icon: 'icon-users-profiles-02',
            label: 'Leaderboard',
            link: '/leaderboard',
          },
          {
            icon: 'icon-refresh-01',
            label: 'My Investment',
            link: '/my-investment',
          },
          {
            icon: 'icon-file-description',
            label: 'Terms & Conditions',
            link: '/terms-conditions',
          },
        ],
      },
      {
        key: 'guzebot',
        menuIcon: 'icon-robot-face',
        icon: 'icon-robot-face',
        label: 'Guzebot',
        link: '/guzebot',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'investment',
        menuIcon: 'icon-coins',
        icon: 'icon-coins',
        label: 'Investment',
        link: '/investment',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'rebate',
        menuIcon: 'icon-gift-box',
        icon: 'icon-gift-box',
        label: 'Rebate Program',
        link: '/rebate/point',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'transactions',
        menuIcon: 'icon-sort-horizontal',
        icon: 'icon-sort-horizontal',
        label: 'Transactions',
        type: 'submenu',
        showDivider: false,
        subItems: [
          {
            icon: 'icon-clock-forward',
            label: 'History',
            link: '/transactions/historys',
          },
        ],
      },
    ],
  },
  {
    categoryHeader: 'Partner Program',
    items: [
      {
        key: 'agent',
        menuIcon: 'icon-code-fork',
        icon: 'icon-code-fork',
        label: 'IB Partner',
        link: '/agent/dashboard',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'referrals',
        menuIcon: 'icon-user-profile-add-02',
        icon: 'icon-user-profile-add-02',
        label: 'Referrals',
        link: '/referrals',
        type: 'link',
        showDivider: true, // มีเส้น Divider คั่นล่างกลุ่ม Partner ตามรูป
      },
    ],
  },
  {
    // กลุ่มสุดท้าย (Account / Settings / Notifications) ไม่มี Header
    items: [
      {
        key: 'notification',
        menuIcon: 'icon-bell-02',
        icon: 'icon-bell-02',
        label: 'Notifications',
        link: '/notification',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'account',
        menuIcon: 'icon-user-circle',
        icon: 'icon-user-circle',
        label: 'User Account',
        type: 'submenu',
        showDivider: false,
        subItems: [
          {
            icon: 'icon-user',
            label: 'User information',
            link: '/account/user-information',
          },
        ],
      },
      {
        key: 'security',
        menuIcon: 'icon-shield-check',
        icon: 'icon-shield-check',
        label: 'Account Security',
        link: '/security/active-sessions',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'download',
        menuIcon: 'icon-download',
        icon: 'icon-download',
        label: 'Download MT5',
        link: '/download',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'settings',
        menuIcon: 'icon-settings',
        icon: 'icon-settings',
        label: 'Settings',
        link: '/settings',
        type: 'link',
        showDivider: false,
      },
      {
        key: 'logout',
        menuIcon: 'icon-logout-02',
        icon: 'icon-logout-02',
        label: 'Logout',
        type: 'button',
        showDivider: false,
      },
    ],
  },
];
