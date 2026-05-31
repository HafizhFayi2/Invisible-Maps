import { Merchant } from '../types';

export const mockMerchants: Merchant[] = [
  {
    id: '1',
    name: 'Nasi Goreng Pak Kumis',
    address: 'Jl. Undaan Wetan No.10, Ketabang, Surabaya',
    category: 'Street Food',
    tags: ['Halal', 'QRIS', 'Late Night'],
    rating: 4.8,
    reviewsCount: 128,
    distance: '120m away',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYcHw7o3a88f-pfrfPRj-UAwnBAJVTZiAASv0nhFWzJL_NIwIQfLNiodsak6xLiEk1YGchwjD1hEDzoZwe1tFEp6Ya8D3N439Ql1Q5juTgfhBwam6l3nFnq2Ck-MShn6rkyhE6cEtWcf_9K8zqbsyVxyoZqAggkUwSdWPAnUeCh-I42FW81w4KJ1v4KYbjs26jrCqLQiRc5tvUnda3vbmQP1uFUxo0Dg8BBUnd-fF-G4tcUUunr6m-7sq7841rR1RfDkEVy6Hb2qhq',
    isVerified: true,
    status: 'Open Now',
    qrisAccepted: true,
    nmid: 'ID1029384756',
    pjpSource: 'Gopay / Midtrans',
    location: { lat: -6.2, lng: 106.8 },
    recentMention: {
      text: 'Best Soto in Undaan area! The koya is incredibly rich.',
      source: 'Twitter/X',
      date: '2 days ago'
    }
  },
  {
    id: '2',
    name: 'Warung Kelontong Bu Siti',
    address: 'Jl. Mawar Merah No. 5, Jakarta Pusat',
    category: 'Warung/Groceries',
    tags: ['Groceries', 'Daily Needs'],
    rating: 4.5,
    reviewsCount: 56,
    distance: '200m away',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0X6guTLZr-HzNWbAbQIVjpe_dSAbmaHKdsiYZ4moeuJZSO9YosJ784lKsBVwcG9vDBXnrzxtljfKn7LEtYxZPCUv0tQfLbFyNrjsLAwbgeysY4BHMc43a7vR8StvrMjv59370XQprSvZFMiADYzxAZD49O-iySS_Y2MUfnSYpplMqiB5au1x7TR9bdO7ZqLGW50fkktWepVH4Jm2sR9OuA2HR3LFx7-a6wd66IhIloJhX1_Bqek5oebsN4lGzk8f2lVHh6qmh2nwv',
    isVerified: false,
    status: 'Open Now',
    qrisAccepted: true,
    location: { lat: -6.21, lng: 106.81 }
  },
  {
    id: '3',
    name: 'Sate Taichan Pak Kumis',
    address: 'Gang Sempit, Menteng, Jakarta',
    category: 'Street Food',
    tags: ['Spicy', 'Dinner'],
    rating: 4.9,
    reviewsCount: 342,
    distance: '1.2 km away',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsGtNGqZNcChmaR893OWkFSlBBHMTRBFWwr-hK6bh9VvM0B5zQcwQfqGyuIZNVRHti0IwHI0GcWS0eMx7FfCUMdU4rz9aZuaBCKjFbQ19oJ3ZsxzPsKiQEsU6wvV5c9TWN_4o5JEEeQLv_yHUAhsNTdSdDkvlnfnEnFS794reuWmfpDdyIoQ2zDH10eRJUQXQDgp_vjKXlSciWn_eL9wYF81BmvsuDVt4z4P0fKlMKLE1uBBEGMKycqXOYx4vKxepQmMkHAxNp1nG0',
    isVerified: true,
    status: 'Open Now',
    qrisAccepted: true,
    location: { lat: -6.22, lng: 106.82 }
  }
];
