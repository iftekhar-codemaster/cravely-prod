// Static dataset. Used as the Firestore seed source (scripts/seed.ts) and
// as an offline fallback while Firebase env vars are not configured.

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  image: string;
  logo: string;
  address: string;
  distanceKm: number;
  openUntil: string;
  verified: boolean;
};

export type Food = {
  id: string;
  name: string;
  restaurantId: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  description: string;
};

export type Review = {
  author: string;
  text: string;
};

export type Story = {
  id: string;
  restaurantId: string;
  name: string;
  image: string;
  caption?: string;
  createdAt?: unknown;
};

export type Offer = { title: string; code: string; bg: string; image: string };

const img = (seed: string, w: number, h: number) =>
  `https://loremflickr.com/${w}/${h}/${seed}`;

export const restaurants: Restaurant[] = [
  {
    id: "kacchi-bhai",
    name: "Kacchi Bhai",
    cuisine: "Bangladeshi",
    rating: 4.7,
    reviews: 1240,
    image: img("biryani", 600, 400),
    logo: img("logo", 100, 100),
    address: "12 Station Road, Thakurgaon",
    distanceKm: 1.2,
    openUntil: "11:00 PM",
    verified: true,
  },
  {
    id: "chillox",
    name: "Chillox",
    cuisine: "Fast Food",
    rating: 4.5,
    reviews: 980,
    image: img("burger", 600, 400),
    logo: img("logo", 101, 100),
    address: "45 College Street, Thakurgaon",
    distanceKm: 2.4,
    openUntil: "12:00 AM",
    verified: true,
  },
  {
    id: "sultans-dine",
    name: "Sultans Dine",
    cuisine: "Biryani",
    rating: 4.6,
    reviews: 2100,
    image: img("kacchi", 600, 400),
    logo: img("logo", 102, 100),
    address: "8 Main Bazar, Thakurgaon",
    distanceKm: 3.1,
    openUntil: "10:30 PM",
    verified: true,
  },
  {
    id: "pizza-hut",
    name: "Pizza Hut",
    cuisine: "Pizza",
    rating: 4.2,
    reviews: 760,
    image: img("pizza", 600, 400),
    logo: img("logo", 103, 100),
    address: "23 Airport Road, Thakurgaon",
    distanceKm: 4.5,
    openUntil: "11:00 PM",
    verified: true,
  },
  {
    id: "star-kabab",
    name: "Star Kabab",
    cuisine: "Kebab",
    rating: 4.4,
    reviews: 640,
    image: img("kebab", 600, 400),
    logo: img("logo", 104, 100),
    address: "5 Old Bus Stand, Thakurgaon",
    distanceKm: 1.8,
    openUntil: "12:00 AM",
    verified: false,
  },
  {
    id: "local-kitchen-1",
    name: "Local Kitchen 1",
    cuisine: "Chinese",
    rating: 4.0,
    reviews: 210,
    image: img("noodles", 600, 400),
    logo: img("logo", 105, 100),
    address: "77 River Side, Thakurgaon",
    distanceKm: 5.2,
    openUntil: "10:00 PM",
    verified: false,
  },
];

export const foods: Food[] = [
  {
    id: "kacchi-bhai-mutton-kacchi",
    name: "Mutton Kacchi",
    restaurantId: "kacchi-bhai",
    price: 320,
    rating: 4.8,
    reviews: 420,
    image: img("kacchi", 400, 300),
    category: "Biryani",
    description:
      "Fragrant basmati rice layered with tender mutton, aged spices and kewra — slow-cooked in the classic kacchi style.",
  },
  {
    id: "kacchi-bhai-beef-tehari",
    name: "Beef Tehari",
    restaurantId: "kacchi-bhai",
    price: 220,
    rating: 4.5,
    reviews: 260,
    image: img("tehari", 400, 300),
    category: "Rice Dishes",
    description:
      "Spicy beef tehari cooked with mustard oil and green chilies, served with borhani.",
  },
  {
    id: "kacchi-bhai-firni",
    name: " Firni",
    restaurantId: "kacchi-bhai",
    price: 90,
    rating: 4.3,
    reviews: 110,
    image: img("dessert", 400, 300),
    category: "Cakes",
    description: "Creamy rice pudding with cardamom, pistachio and rose water.",
  },
  {
    id: "chillox-smoky-burger",
    name: "Smoky BBQ Burger",
    restaurantId: "chillox",
    price: 250,
    rating: 4.6,
    reviews: 340,
    image: img("burger", 401, 300),
    category: "Burgers",
    description:
      "Double smashed beef patties, smoked BBQ sauce, cheddar and crispy onions on a toasted brioche bun.",
  },
  {
    id: "chillox-crispy-chicken",
    name: "Crispy Fried Chicken",
    restaurantId: "chillox",
    price: 180,
    rating: 4.4,
    reviews: 290,
    image: img("friedchicken", 400, 300),
    category: "Chicken",
    description:
      "Buttermilk-brined chicken, double-dredged and fried golden. Served with house dip.",
  },
  {
    id: "chillox-loaded-fries",
    name: "Loaded Fries",
    restaurantId: "chillox",
    price: 150,
    rating: 4.2,
    reviews: 180,
    image: img("fries", 400, 300),
    category: "Snacks",
    description:
      "Golden fries topped with cheese sauce, jalapeños and smoked mayo.",
  },
  {
    id: "sultans-dine-kacchi-full",
    name: "Kacchi Platter (Full)",
    restaurantId: "sultans-dine",
    price: 380,
    rating: 4.7,
    reviews: 520,
    image: img("biriyani", 400, 300),
    category: "Biryani",
    description:
      "Signature mutton kacchi with jali kabab, salad and borhani. Serves one generously.",
  },
  {
    id: "sultans-dine-chicken-biryani",
    name: "Chicken Biryani",
    restaurantId: "sultans-dine",
    price: 200,
    rating: 4.5,
    reviews: 410,
    image: img("rice", 400, 300),
    category: "Rice Dishes",
    description:
      "Aromatic chicken biryani with potatoes and boiled egg, cooked dum style.",
  },
  {
    id: "sultans-dine-jali-kabab",
    name: "Jali Kabab",
    restaurantId: "sultans-dine",
    price: 120,
    rating: 4.4,
    reviews: 160,
    image: img("kebab", 401, 300),
    category: "Kebab",
    description: "Minced meat kebab fried to a delicate lattice — a kacchi classic side.",
  },
  {
    id: "pizza-hut-pepperoni",
    name: "Pepperoni Feast",
    restaurantId: "pizza-hut",
    price: 550,
    rating: 4.3,
    reviews: 230,
    image: img("pizza", 401, 300),
    category: "Pizza",
    description:
      "Loaded with double pepperoni and extra mozzarella on pan pizza base.",
  },
  {
    id: "pizza-hut-chicken-tikka",
    name: "Chicken Tikka Pizza",
    restaurantId: "pizza-hut",
    price: 500,
    rating: 4.2,
    reviews: 190,
    image: img("pizzachicken", 400, 300),
    category: "Pizza",
    description: "Tandoori chicken tikka, onions, capsicum on a cheesy pan base.",
  },
  {
    id: "pizza-hut-garlic-bread",
    name: "Garlic Bread Sticks",
    restaurantId: "pizza-hut",
    price: 160,
    rating: 4.1,
    reviews: 140,
    image: img("bread", 400, 300),
    category: "Snacks",
    description: "Oven-baked sticks brushed with garlic butter, served with cheese dip.",
  },
  {
    id: "star-kabab-sheek-kabab",
    name: "Sheek Kabab (4 pcs)",
    restaurantId: "star-kabab",
    price: 160,
    rating: 4.5,
    reviews: 220,
    image: img("sheek", 400, 300),
    category: "Kebab",
    description: "Charcoal-grilled minced beef skewers with paratha and onion salad.",
  },
  {
    id: "star-kabab-chicken-shawarma",
    name: "Chicken Shawarma",
    restaurantId: "star-kabab",
    price: 130,
    rating: 4.6,
    reviews: 310,
    image: img("shawarma", 400, 300),
    category: "Fast Food",
    description:
      "Juicy shaved chicken, garlic mayo and pickles rolled in warm flatbread.",
  },
  {
    id: "star-kabab-luchi-beef",
    name: "Luchi & Beef Bhuna",
    restaurantId: "star-kabab",
    price: 170,
    rating: 4.2,
    reviews: 120,
    image: img("curry", 400, 300),
    category: "Bangladeshi",
    description: "Fluffy luchi with slow-cooked spicy beef bhuna.",
  },
  {
    id: "local-1-chicken-fried-rice",
    name: "Chicken Fried Rice",
    restaurantId: "local-kitchen-1",
    price: 190,
    rating: 4.1,
    reviews: 90,
    image: img("friedrice", 400, 300),
    category: "Chinese",
    description: "Wok-tossed rice with chicken, egg and seasonal vegetables.",
  },
  {
    id: "local-1-hakka-noodles",
    name: "Hakka Noodles",
    restaurantId: "local-kitchen-1",
    price: 170,
    rating: 4.0,
    reviews: 70,
    image: img("noodles", 401, 300),
    category: "Chinese",
    description: "Stir-fried noodles with crunchy vegetables and soy-garlic glaze.",
  },
  {
    id: "local-1-cold-coffee",
    name: "Cold Coffee",
    restaurantId: "local-kitchen-1",
    price: 110,
    rating: 4.3,
    reviews: 60,
    image: img("coffee", 400, 300),
    category: "Cafe",
    description: "Blended chilled coffee topped with cream and chocolate drizzle.",
  },
];

export const stories: Story[] = [
  {
    id: "story-kacchi-bhai",
    restaurantId: "kacchi-bhai",
    name: "Kacchi Bhai",
    image: "https://loremflickr.com/400/700/kacchi?lock=301",
    caption: "Today's kacchi — slow cooked since dawn.",
  },
  {
    id: "story-chillox",
    restaurantId: "chillox",
    name: "Chillox",
    image: "https://loremflickr.com/400/700/burger?lock=302",
    caption: "Fresh patties dropping at 6 PM.",
  },
  {
    id: "story-sultans-dine",
    restaurantId: "sultans-dine",
    name: "Sultans Dine",
    image: "https://loremflickr.com/400/700/biriyani?lock=303",
    caption: "Jali kabab restocked.",
  },
  {
    id: "story-star-kabab",
    restaurantId: "star-kabab",
    name: "Star Kabab",
    image: "https://loremflickr.com/400/700/kebab?lock=305",
    caption: "Charcoal grill is lit.",
  },
];

export const offers: Offer[] = [
  {
    title: "50% Off Kacchi",
    code: "CRAVELY50",
    bg: "rgba(0,0,0,0.5)",
    image: "https://loremflickr.com/400/200/biryani?lock=100",
  },
  {
    title: "Free Delivery",
    code: "On orders over ৳500",
    bg: "rgba(220, 39, 67, 0.7)",
    image: "https://loremflickr.com/400/200/delivery?lock=101",
  },
  {
    title: "Buy 1 Get 1 Pizza",
    code: "Valid till 8 PM today",
    bg: "rgba(0, 150, 136, 0.7)",
    image: "https://loremflickr.com/400/200/pizza?lock=102",
  },
];

export const cuisines: string[] = [
  "Biryani",
  "Pizza",
  "Fast Food",
  "Bangladeshi",
  "Burgers",
  "Cakes",
  "Rice Dishes",
  "Snacks",
  "Kebab",
  "Sweets",
  "Chinese",
  "Chicken",
];

export const reviewPool: Record<string, Review[]> = {
  default: [
    { author: "Alex M.", text: "Absolutely amazing! Portions are generous." },
    { author: "Sarah K.", text: "Best in town. Highly recommended." },
    { author: "Rafi H.", text: "Good taste, delivery was quick too." },
  ],
};
