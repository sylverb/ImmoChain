import { registerScpi, dashboard, logout, payment, profile, withdraw } from '../assets';

export const navlinks = [
  {
    name: 'Dashboard',
    imgUrl: dashboard,
    link: '/',
  },
  {
    name: 'Register',
    imgUrl: registerScpi,
    link: '/register-scpi',
  },
/*  {
    name: 'payment',
    imgUrl: payment,
    link: '/',
    disabled: true,
  },
  {
    name: 'withdraw',
    imgUrl: withdraw,
    link: '/',
    disabled: true,
  },
  {
    name: 'profile',
    imgUrl: profile,
    link: '/profile',
  },*/
  {
    name: 'logout',
    imgUrl: logout,
    link: '/',
    disabled: true,
  },
];
