export interface NavItem {
  label: string;
  href: string;
}

export const navbarConfig = {
  logo: {
    src: '/logo.png',
    width: 70,
    height: 70,
  },
  navItems: [
    {
      label: 'All Games',
      href: '/games',
    },
    {
      label: 'Practice Arena',
      href: '/arena',
    },
    {
      label: 'For Companies',
      href: '/company',
    },
    {
      label: 'AWS DB',
      href: '/aws',
    },
  ] as NavItem[],
};
