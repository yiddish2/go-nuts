import cashewsImg from "@/assets/cashews.jpg";
import almondsImg from "@/assets/almonds.jpg";
import walnutsImg from "@/assets/walnuts.jpg";
import pistachiosImg from "@/assets/pistachios.jpg";
import trailMixImg from "@/assets/trail-mix.jpg";
import pecansImg from "@/assets/pecans.jpg";
import peanutsImg from "@/assets/peanuts.jpg";
import macadamiaImg from "@/assets/macadamia.jpg";

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description: string;
  weight: string;
  tags: string[];
};

export const products: Product[] = [
  {
    id: "1",
    name: "Roasted Cashews",
    price: 12.99,
    image: cashewsImg,
    category: "Cashews",
    description: "Premium whole cashews, lightly salted and perfectly roasted for a rich, buttery crunch.",
    weight: "12 oz",
    tags: ["Gluten-Free", "Kosher"],
  },
  {
    id: "2",
    name: "Raw Almonds",
    price: 10.99,
    image: almondsImg,
    category: "Almonds",
    description: "California-grown raw almonds, packed with protein and natural goodness.",
    weight: "16 oz",
    tags: ["Raw", "Gluten-Free"],
  },
  {
    id: "3",
    name: "English Walnuts",
    price: 11.49,
    image: walnutsImg,
    category: "Walnuts",
    description: "Premium English walnut halves with a mild, earthy flavor perfect for baking or snacking.",
    weight: "12 oz",
    tags: ["Raw", "Gluten-Free"],
  },
  {
    id: "4",
    name: "Roasted Pistachios",
    price: 14.99,
    image: pistachiosImg,
    category: "Pistachios",
    description: "In-shell pistachios roasted to perfection with a touch of sea salt.",
    weight: "16 oz",
    tags: ["Gluten-Free", "Kosher"],
  },
  {
    id: "5",
    name: "Classic Trail Mix",
    price: 9.99,
    image: trailMixImg,
    category: "Mixes",
    description: "A hearty blend of almonds, cashews, peanuts and raisins for the perfect on-the-go snack.",
    weight: "14 oz",
    tags: ["Gluten-Free"],
  },
  {
    id: "6",
    name: "Butter Pecans",
    price: 13.49,
    image: pecansImg,
    category: "Pecans",
    description: "Southern pecans with a buttery glaze, irresistibly sweet and crunchy.",
    weight: "10 oz",
    tags: ["Gluten-Free"],
  },
  {
    id: "7",
    name: "Honey Roasted Peanuts",
    price: 7.99,
    image: peanutsImg,
    category: "Peanuts",
    description: "Classic peanuts coated in a sweet honey glaze and roasted until golden.",
    weight: "16 oz",
    tags: ["Gluten-Free", "Kosher"],
  },
  {
    id: "8",
    name: "Macadamia Nuts",
    price: 18.99,
    image: macadamiaImg,
    category: "Macadamia",
    description: "Hawaiian macadamia nuts — rich, creamy and luxuriously smooth.",
    weight: "8 oz",
    tags: ["Raw", "Gluten-Free"],
  },
];

export const categories = ["All", "Cashews", "Almonds", "Walnuts", "Pistachios", "Mixes", "Pecans", "Peanuts", "Macadamia"];
