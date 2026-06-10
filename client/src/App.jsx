import React, { useEffect, useMemo, useState } from "react";
import AdminLogin from "./components/admin/AdminLogin";
import {
  authApi,
  setSession,
  clearSession,
  getStoredUser,
  userApi,
  adminApi,
  paymentApi,
  settingsApi,
} from "./api";
import { orderApi } from "./api";
import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleProvider } from "./firebase";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import AdminDashboard from "./components/admin/AdminDashboard";
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const categories = [
  { id: "pizza", name: "Pizzas", items: [
    ["Margherita Pizza", 0.30, "With pizza sauce & mozzarella cheese."],
    ["Vegetarian Pizza", 8.0, "Onions, peppers, mushroom, sweetcorn and tomatoes."],
    ["Slick Chick Pizza", 8.5, "Chicken shawarma, pepperoni, chicken and green chillies."],
    ["Donner Double Pizza", 8.95, "Double portion of donner meat."],
    ["Pepperoni Passion Pizza", 8.95, "Pepperoni with every bite."],
    ["Spicy Chicken Pizza", 8.95, "Spicy marinated chicken."],
    ["Sweet and Spicy Pizza", 8.95, "Spicy chicken and pineapple."],
    ["Tornado Special Pizza", 8.95, "Spicy chicken, pepperoni and onions."],
    ["Chicken Pakora Pizza", 9.0, "Chicken pakora pieces on a spiced base."],
    ["Caspian Favourite", 9.0, "Donner, chicken tikka, onion, peppers and jalapeño."],
    ["Hawaiian Pizza", 9.5, "Ham and pineapple."],
    ["Meatball Marinara Pizza", 9.5, "Meatballs in rich marinara sauce."],
    ["Pollo Pizza", 9.5, "Chicken and sweetcorn."],
    ["Tornado Pizza", 9.5, "Spicy chicken and spicy pepperoni."],
    ["Turkish Delight Pizza", 9.5, "Donner meat, spiced onions and chilli base."],
    ["Four Seasons Pizza", 9.5, "Chicken, mixed peppers, mushrooms and onion."],
    ["Asian Style Pizza", 9.95, "Chicken tikka, onions, peppers, hot spices and herbs."],
    ["Four Nations Pizza", 9.95, "Chicken tikka, donner meat, ham and pepperoni."],
    ["Mexican Volcano Pizza", 9.95, "Spicy chicken, spicy beef, ham and green chillies."],
    ["Istanbulian Pizza", 9.95, "Spicy chicken, donner meat and spicy onions."],
    ["Full House Pizza", 9.95, "Onions, mushrooms, donner and chicken."],
    ["Mighty Meat Pizza", 9.95, "Donner, spicy chicken, spicy beef, ham, pepperoni and chicken tikka."],
    ["Salt and Pepper Chicken Pizza", 9.95, "Salt and pepper chicken with house spice."],
    ["Any Curry Pizza", 11.95, "Chicken korma, chicken madras or chicken jalfrezi pizza."],
    ["Half Pizza Half Calzone", 12.5, "Any pizza and any calzone combined."],
  ] },
  { id: "offers", name: "Special Offers", items: [
    ["Burger Meal 1", 6.0, "Cheese / Chicken / Peri Peri burger, chips, salad, sauce and a can of juice."],
    ["Kebab Meal 1", 7.5, "Large donner or mix kebab, chips and a can of juice."],
    ["Kebab Meal 2", 8.5, "Arabian kebab, cheese layer, chopped pita, rice, chips, chicken tikka, garlic butter sauce and a can of juice."],
    ["Salt and Pepper Munchie Box", 8.5, "Popcorn chicken, chicken nuggets, chicken strips, shawarma, donner and chips."],
    ["Special Munchie Box", 12.0, "Chips and cheese, chicken pakora, donner, shawarma, onion rings, chicken nuggets, salad and 2 dips."],
    ["Calzone Meal 2", 13.5, "Donner, chicken tikka, shawarma, ham, pepperoni or BBQ chicken with peppers, mushroom, chips, chilli sauce and a can of juice."],
    ["Euro Munchie Box", 14.5, "Chicken tikka, chicken pakora, chicken strips, chicken nuggets, mozzarella sticks, garlic mushroom, spring roll, donner, shawarma with chips, salad and two sauces."],
    ["Executive Meal One", 14.5, "Any curry, mix pakora, rice or naan, poppadom and spiced onion."],
    ["Tandoori Box", 14.5, "Chicken tikka, BBQ chicken, spicy chicken, sheek kebab, chicken chat, chicken wings, donner and shawarma with chips, salad and two sauces."],
    ["Euro and Tandoori Mega Box", 16.0, "Chicken tikka, BBQ chicken, spicy chicken, sheek kebab, donner shawarma, chicken nuggets, spicy mini fillets, chicken wings, popcorn chicken and chicken pakora with chips, salad and two sauces."],
    ["Calzone Meal", 16.5, "2 x 7\" donner or mix calzone with chips, salad, two juices and choice of chilli, garlic or BBQ sauce."],
    ["Executive Munch Box 16\"", 19.95, "Chicken tikka, tandoori wings, chicken pakora, vegetable pakora, onion rings, donner, popcorn chicken, chips, naan and 2L juice."],
    ["Mega Pizza Deal 10\"", 23.5, "10\" pizza with Euro Munchie Box and 2 cans of juice."],
    ["Pizza Meal 2 12\"", 26.95, "Any 2 pizzas with salt & pepper chips and garlic bread."],
    ["Mega Pizza Deal 12\"", 28.5, "12\" pizza with Euro Munchie Box and 2 cans of juice."],
  ] },
  { id: "calzone", name: "Calzone", items: [
    ["Calzone Donner Meat", 6.5, "Donner meat calzone."],
    ["Mixed Calzone", 7.5, "Donner meat and chicken tikka."],
    ["Meat Feast Calzone", 7.5, "Donner meat, pepperoni, ham and chicken tikka."],
    ["Chicken Tikka Calzone", 8.5, "With onion, peppers and mushrooms."],
    ["Garlic Crunch Calzone", 11.5, "Donner meat, creamy garlic mushrooms and garlic sauce."],
    ["Donner Crunch Calzone", 11.5, "Donner, crispy chicken pakora and nacho cheese."],
    ["Donner Supreme Calzone", 11.5, "Chicken pakora, donner and spicy onions."],
    ["Any Curry Calzone", 11.95, "Choose chicken korma, bhuna masala, garlic chilli, madras or donner."],
  ] },
 {
  id: "burgers",
  name: "Grilled Burgers",
  items: [
    ["Chicken Burger", 3.5, "Grilled chicken burger served with salad and sauce."],
    ["Plain Burger", 3.5, "Classic plain burger served with salad and sauce."],
    ["Cheese Burger", 4.0, "Cheeseburger served with salad and sauce."],
    ["Spicy Zinger Burger", 4.5, "Spicy zinger chicken burger served with salad and sauce."],
    ["Texan Burger", 5.0, "Cheeseburger with onion rings and donner meat."],
    ["Peri Peri Burger", 4.5, "Peri peri style grilled burger served with salad and sauce."],
    ["Big Bite Burger", 5.5, "Cheeseburger with chicken, hash brown and donner meat."],
    ["Mexican Volcano", 5.5, "Cheeseburger with spicy chicken, jalapenos and pepperoni."],
    ["Tower Burger", 5.5, "Cheeseburger with chicken, hash brown and curry sauce."],
    ["Daddy Burger", 5.5, "Cheeseburger with chicken, onion rings and donner meat."],
    ["New York Burger", 5.5, "Cheeseburger with fried onions and fried mushrooms."],
    ["Caspian Special Burger", 5.5, "Double cheeseburger with fried onions, mushrooms, peppers and cooked pepperoni."],
    ["Special Burger", 5.5, "Cheeseburger with chicken shawarma, salad and sauce."],
    ["Roll Donner Tikka Burger", 4.0, "Donner tikka in a soft roll."],
    ["Roll Chicken Tikka Burger", 4.0, "Chicken tikka in a soft roll."],
    ["Omelette Burger", 5.0, "Cheeseburger with cheese omelette."]
  ]
},
  { id: "naankebabs", name: "Naan Kebabs", items: [
    ["Donner Kebab (Naan)", 11.0, "Donner on naan with salad and chilli sauce."],
    ["Chicken Shawarma BBQ Kebab", 12.0, "Chicken shawarma BBQ kebab on naan."],
    ["Chicken Tikka Kebab (Naan)", 12.0, "Chicken tikka on naan."],
    ["Spicy Chicken Kebab (Naan)", 12.0, "Spicy chicken on naan."],
    ["Special Mix Naan Kebab", 12.0, "Donner, chicken tikka and shish with fried onion, mushrooms and green peppers."],
    ["Caspian Special Kebab (Naan)", 12.0, "Chicken tikka, BBQ chicken, sheek kebab, spicy chicken and donner mix."],
    ["Egyptian Kebab (Naan)", 12.0, "Chicken tikka with chunks of onion, pepper and mushroom in sweet and sour sauce."],
    ["Turkish Kebab (Naan)", 12.0, "Chicken and donner marinated overnight, BBQ-grilled with onions, peppers and mushrooms."],
    ["Peri Peri Kebab (Naan)", 12.0, "Chicken in peri peri sauce with special spices."],
    ["Loaded Curry Naan Kebab", 12.0, "Naan topped with curry, melted cheese and donner — korma, madras, masala, jalfrezi or bhuna."],
  ] },
  { id: "kebabs", name: "Kebabs", items: [
    ["Portion Donner Meat Kebab", 5.5, "Donner meat with salad and sauce."],
    ["Portion Shawarma Kebab", 5.5, "Shawarma meat with salad and sauce."],
    ["Donner Kebab", 6.5, "Donner kebab with salad and sauce."],
    ["Shawarma Kebab", 7.5, "Shawarma kebab with salad and sauce."],
    ["Spicy Chicken Kebab", 7.5, "Spicy chicken kebab."],
    ["BBQ Kebab", 7.5, "BBQ chicken kebab."],
    ["Mixed Kebab", 7.5, "Tikka, shawarma and donner."],
    ["Peri Peri Kebab", 7.5, "Chicken cooked in peri peri sauce."],
    ["Caspian Special Kebab", 8.5, "Chicken & lamb tikka, BBQ chicken and donner."],
    ["Egyptian Kebab", 8.5, "Chicken tikka in a wok with onions, mushrooms and peppers in sweet and sour sauce."],
    ["Turkish Kebab", 8.5, "BBQ chicken marinated with special sauce, onions, peppers and mushrooms."],
  ] },
  { id: "wraps", name: "Hoagies & Wraps", items: [
    ["Donner Wrap", 5.5, "Donner with salad, chips, chilli and garlic sauce."],
    ["Spicy Chicken Wrap", 6.0, "Spicy chicken with salad and sauces."],
    ["Chicken Tikka Wrap", 6.0, "Chicken tikka with salad and sauces."],
    ["Mixed Chicken Tikka & Donner Wrap", 6.0, "Chicken tikka and donner meat wrap."],
    ["Meat Feast Wrap", 6.0, "Chicken tikka, donner and spicy chicken."],
    ["Chicken Shawarma Wrap", 6.0, "Shawarma wrap with salad and sauces."],
    ["Spicy Zinger Wrapster", 6.0, "Spicy zinger wrap."],
    ["Chicken Strips Wrap", 6.5, "Chicken strips wrap."],
    ["Shawarma & Donner Wrap", 7.0, "Combined shawarma and donner wrap."],
  ] },
  { id: "starters", name: "Starters", items: [
    ["Spicy Potato Fritter", 3.5, "Battered with special spices."],
    ["Spicy Mushroom", 3.5, "Spicy fried mushrooms."],
    ["Onion Rings", 3.5, "Crispy onion rings."],
    ["Garlic Mushroom", 4.0, "Mushroom with garlic butter."],
    ["Onion Bhaji", 4.0, "Classic onion bhaji."],
    ["Jalapeño Poppers", 4.0, "Cheese-filled jalapeño poppers."],
    ["Creamy Garlic Mushroom", 4.0, "Mushrooms in a creamy garlic sauce."],
    ["Spring Roll", 4.0, "Crispy vegetable spring roll."],
    ["Vegetable Pakora", 4.5, "Spiced vegetable fritters."],
    ["Mushroom Pakora", 4.5, "Crispy battered mushrooms."],
    ["Chicken Puri", 5.0, "Chicken puri starter."],
    ["Mince Samosa", 5.0, "Spiced mince samosas."],
    ["Chicken Tikka Starter", 5.5, "Tandoor-cooked chicken tikka."],
    ["Chicken Wings", 5.5, "Spiced chicken wings."],
    ["Chicken Pakora", 6.5, "Tender chicken pieces in crispy pakora coating."],
    ["Mix Pakora", 6.5, "Chicken and vegetable pakora."],
    ["Salt and Pepper Hash Browns", 3.0, "Crispy salt and pepper hash browns."],
    ["Spicy Poppadom & Spicy Onion", 2.5, "Poppadom with spicy onion relish."],
    ["Plain Poppadoms", 1.5, "Crisp plain poppadoms."],
  ] },
  { id: "tikkastarter", name: "Tikka Starters", items: [
    ["Chicken Chat Tikka Starter", 5.0, "Chicken chat tikka."],
    ["Sheek Kebab Tikka Starter", 5.5, "Sheek kebab tikka starter."],
    ["Garlic Chicken Tikka Starter", 6.0, "Garlic chicken tikka."],
    ["Finger Lickin Hot Chicken Wings", 6.5, "Spicy chicken wings."],
    ["Lamb Tikka Starter", 7.0, "Lamb tikka starter."],
    ["Tandoori Mix Tikka Starter", 7.5, "Chicken tikka, BBQ chicken, shish kebab and chicken wings."],
  ] },
  { id: "snacks", name: "Quick Snacks", items: [
    ["Chips", 2.7, "Coated and salted crunchy fries."],
    ["Plain Poppadoms", 1.5, "Plain poppadoms."],
    ["Nacho with Cheese", 3.5, "Nachos topped with cheese."],
    ["Spicy Potato Wedges", 3.5, "Spicy potato wedges."],
    ["Curly Fries", 3.5, "Seasoned curly fries."],
    ["Mozzarella Sticks", 4.0, "Crispy mozzarella sticks with chips."],
    ["Spicy Wings", 4.0, "Spicy wings with chips."],
    ["Spicy Strips", 4.0, "Spicy chicken strips with chips."],
    ["Chicken Popcorn", 4.0, "Bite-size popcorn chicken."],
    ["Garlic Bread (Pepperoni & Cheese)", 4.0, "Garlic bread topped with pepperoni and cheese."],
    ["Nacho with Chicken Tikka", 4.0, "Nachos topped with chicken tikka."],
    ["Caspian Chips (18+)", 4.5, "Pakora battered chips with spice — age restriction 18+."],
    ["Loaded Fries with Shawarma", 5.0, "Loaded fries topped with shawarma."],
    ["Chips and Chicken Tikka", 5.0, "Chips topped with chicken tikka."],
    ["Chips and Curry Sauce", 5.0, "Chips with korma, madras, garlic chilli or jalfrezi sauce."],
    ["Chilli Cheese Bites (12pc)", 5.0, "12 chilli cheese bites."],
    ["Nacho with Shawarma & Donner", 5.0, "Nachos with extra toppings, salsa, jalapeños, chilli and garlic sauce."],
    ["Chips and Spicy Chicken", 5.5, "Chips with spicy chicken (large)."],
    ["Chips and Donner", 5.5, "Chips with donner meat."],
    ["Tray of Donner Meat", 5.5, "Tray of donner meat."],
    ["Chicken Korma (Rice & Chips)", 6.5, "Chicken korma with rice and chips in the same container."],
    ["Chicken Curry (Rice & Chips)", 6.5, "Chicken curry with rice and chips in the same container."],
  ] },
  { id: "salads", name: "Salads", items: [
    ["Chicken and Sweetcorn Salad", 4.95, "Chicken, sweetcorn, pineapple and fresh salad."],
    ["Special Prawn Cocktail Salad", 4.95, "Prawn, pineapple, cocktail sauce and fresh salad."],
    ["Tuna Salad", 4.95, "Tuna, sweetcorn, pineapple, mayonnaise and fresh salad."],
    ["Caspian Special Salad", 5.5, "Chicken tikka, peppers, red onion and fresh salad."],
  ] },
  { id: "omelette", name: "Omelette", items: [
    ["Create Your Own Omelette", 3.5, "Choose from spinach, cheese, ham, mushroom, onion, spicy veg or chicken tikka. Extra toppings £1.20."],
    ["Chicken & Mushroom Omelette", 5.95, "Classic chicken and mushroom omelette."],
    ["French Omelette", 5.95, "Onion, mushroom and ham."],
    ["Indian Omelette", 5.95, "Spicy vegetables and chicken tikka."],
  ] },
  { id: "european", name: "European Dishes", items: [
    ["Baked Potato", 3.5, "Choose from butter, cheese or tuna."],
    ["Special Fish (1pc)", 4.5, "Battered fish, fries, salad and garlic sauce."],
    ["Fried Chicken Breast", 5.5, "Fried chicken breast with fries, salad and garlic sauce."],
    ["11pcs Chicken Nuggets", 6.5, "Chicken nuggets with fries, salad and garlic sauce."],
    ["11pcs Scampi", 6.5, "Scampi with fries, salad and garlic sauce."],
    ["Special Fish (2pc)", 6.5, "Two pieces of battered fish with fries, salad and garlic sauce."],
  ] },
  { id: "chefspecial", name: "Chef's Specialities", items: [
    ["Tikka Masala", 11.95, "In a creamy masala sauce."],
    ["Karahi", 11.95, "Thick curry with onions, peppers, tomatoes, ginger, garlic and spring onion."],
    ["Rogan Josh", 11.95, "Tikka style with fresh ginger, garlic, fried onions and peppers."],
    ["Butter Chicken", 11.95, "Tender chicken in a mild, rich and silky butter sauce."],
    ["Jalfrezi", 11.95, "Cooked with onions, peppers, mushrooms, tomatoes and green chillies."],
    ["Pasanda", 11.95, "Delicate dish with cream and natural yogurt."],
    ["Balti", 11.95, "Chunks of onions, peppers, fresh green chillies and balti spices."],
    ["South Indian Garlic Chilli", 11.95, "Rich curry in butter with garlic and green chillies."],
    ["Caspian Special", 11.95, "Chicken, lamb and prawn in a special tomato sauce."],
    ["Spinach Tikka Masala", 11.95, "Cooked with ginger, garlic, spinach and masala sauce."],
    ["Garlic Korma", 11.95, "Tikka korma with garlic butter."],
    ["Chasni", 11.95, "Creamy tangy sweet and sour sauce."],
    ["Chilli Masala", 11.95, "Thick hot masala with coriander and sun-dried chillies."],
    ["Shahi Bhuna", 11.95, "Thick sauce with onions and peppers, traditional flavour."],
    ["Punjabi Masala", 11.95, "Onions, peppers and Punjabi spices."],
    ["Balti Butter", 11.95, "Creamy balti spices with ginger, garlic and crushed chillies."],
    ["North Indian Chilli Masala", 11.95, "Masala with onions, peppers, garlic and chilli."],
    ["Vindaloo", 11.95, "Extremely hot — only for the brave."],
    ["Garlic Butter Masala", 11.95, "Marinated chicken in garlic and spring onion."],
    ["Chicken Tikka Chilli Bhuna", 11.95, "Cooked in special hot sauce with green chillies."],
  ] },
  { id: "favourites", name: "Old Classic Favourites", items: [
    ["Korma", 10.95, "Creamy dish using coconut cream, slightly sweet."],
    ["Dopiaza", 10.95, "Traditional favourite with onions."],
    ["Curry", 10.95, "Traditional favourite."],
    ["Madras", 10.95, "Prepared with chillies (spicy)."],
    ["Bhuna", 10.95, "Tomatoes, onions, ginger and spices in a thick sauce."],
    ["Kashmiri Korma", 10.95, "Pineapple, coconut, rich and creamy."],
    ["Mushroom Curry", 10.95, "Traditional curry with mushrooms."],
    ["Methi", 10.95, "Methi and herbs."],
    ["Pathia", 10.95, "Sweet and sour with mango, lemon juice and exotic spices."],
    ["Dansak", 10.95, "Curried lentils with herbs and spices."],
    ["Spinach", 10.95, "Traditional curry with spinach."],
  ] },
  { id: "sidedishes", name: "Side Dishes", items: [
    ["Saag Aloo", 7.5, "Fresh spinach and tomato cooked with spices."],
    ["Bombay Aloo", 7.5, "Potato and tomato with Indian spices."],
    ["Mixed Vegetable Bhaji", 7.5, "Mixed vegetables with onions, peppers, ginger, garlic and spices."],
    ["Mushroom Bhaji", 7.5, "Mushrooms with onions, peppers, tomatoes, ginger, garlic and spices."],
    ["Chana Bhaji", 7.5, "Chickpeas with onions, peppers, tomatoes, ginger, garlic and spices."],
    ["Tarka Dal", 7.5, "Lentils cooked with butter, ginger, garlic and spices."],
  ] },
  { id: "biryani", name: "Biryani Dishes", items: [
    ["Vegetable Biryani", 10.0, "Served with a bhuna sauce."],
    ["Chicken Biryani", 11.5, "Served with a bhuna sauce."],
    ["Chicken Tikka Biryani", 12.0, "Served with a bhuna sauce."],
    ["Hyderabad Biryani (Hot)", 12.0, "Chicken tikka with spicy vegetable (spicy)."],
    ["Lamb Biryani", 13.5, "Served with a bhuna sauce."],
  ] },
  { id: "tandoori", name: "Tandoori Charcoal Dishes", items: [
    ["Chicken Tikka Main", 12.0, "Lean chicken breast marinated in special yoghurt sauce."],
    ["Half Tandoori Chicken Main", 12.0, "Chicken marinated in special sauce with yoghurt, on the bone."],
    ["Egyptian Chicken", 12.0, "Chicken tikka with onions, mushrooms and peppers in sweet and sour sauce."],
    ["Mixed Tikka Tandoori Main", 15.5, "Chicken and lamb tikka."],
    ["Lamb Tikka Main", 16.5, "Lean lamb marinated in yoghurt sauce."],
    ["Tandoori Mixed Grill", 22.5, "Chicken and lamb tikka, donner, sheek kebab, naan and curry sauce."],
  ] },
  { id: "breads", name: "Breads", items: [
    ["Pitta bread", 0.75, "Flaky wholemeal bread, freshly cooked."],
    ["Chapati", 1.25, "Thin wholemeal flatbread."],
    ["Paratha", 2.5, "Flaky wholemeal bread cooked with butter."],
    ["Plain Naan", 2.5, "Freshly baked in the tandoor."],
    ["Garlic Naan", 3.0, "Garlic naan."],
    ["Wholemeal Naan", 3.0, "Made with premium wholemeal flour."],
    ["Cheese Naan", 4.0, "Cheese-filled naan."],
    ["Peshwari Naan (Sweet)", 4.5, "Sweet peshwari naan."],
    ["Cheese and Garlic Naan", 4.5, "Cheese and garlic naan."],
    ["Keema Naan (Mince)", 4.5, "Mince-stuffed naan."],
    ["Chicken Tikka & Spicy Veg Naan", 5.0, "Stuffed naan with chicken tikka and spicy veg."],
  ] },
  { id: "rice", name: "Rice", items: [
    ["Pilau Rice", 2.5, "Basmati rice steamed with light Indian spices."],
    ["Boiled Rice", 2.5, "Plain steamed basmati."],
    ["Fried Rice", 3.5, "Wok-cooked with onion, peppers and subtle spices."],
    ["Spicy Fried Rice", 3.5, "Spicy fried rice."],
    ["Mushroom Fried Rice", 4.0, "Fried rice with mushrooms."],
    ["Egg Fried Rice", 4.0, "Fried rice with egg."],
    ["Vegetable Rice", 4.0, "Fried rice with mixed vegetables."],
    ["Chickpeas Rice", 4.0, "Fried rice with chickpeas."],
    ["Chicken Tikka Rice", 5.0, "Fried rice with chicken tikka."],
    ["Prawn Fried Rice", 5.0, "Fried rice with prawns."],
  ] },
  { id: "extras", name: "Extras & Sauces", items: [
    ["Pitta Bread", 0.75, "Flaky wholemeal bread."],
    ["Chilli Sauce", 0.9, "Pot of chilli sauce."],
    ["Garlic Sauce", 0.9, "Pot of garlic sauce."],
    ["Pakora Sauce", 0.9, "Pot of pakora sauce."],
    ["Mint Sauce", 0.9, "Pot of mint sauce."],
    ["Spiced Onions", 1.0, "Pot of spiced onions."],
    ["Side Salad", 1.5, "Fresh side salad."],
    ["Portion of Coleslaw", 2.0, "Pot of coleslaw."],
    ["Raita Yoghurt", 3.0, "Yoghurt with tomato, onion and cucumber."],
    ["Curry Sauce", 5.0, "Pot of curry sauce."],
    ["Bhuna Sauce", 5.5, "Pot of bhuna sauce."],
    ["Korma Sauce", 5.5, "Pot of korma sauce."],
    ["Tikka Masala Sauce", 5.5, "Pot of tikka masala sauce."],
  ] },
  { id: "mealdeals", name: "Meal Deals", items: [
    ["Meal 1", 20.0, "Mix pakora, any 2 curries from All Favourites, rice, naan and salad."],
    ["Meal 2", 23.5, "Mix pakora, any 2 chef's specials, rice, 1 naan, spiced onions and poppadoms."],
    ["Meal 3", 22.0, "Chicken tikka starter, 1 chef's special + 1 old favourite, spicy onion, poppadoms, naan and rice."],
    ["Meal 5", 24.5, "Chicken tikka main, any 1 curry, chicken pakora, 2 rice, 1 naan, spicy onion and poppadoms."],
    ["Meal 6", 28.5, "Chicken pakora, chicken tikka starter, any 2 chef's recommendations (no king prawn), rice, garlic naan, 4 poppadoms and spicy onion."],
    ["Meal 07", 32.0, "Chicken & vegetable pakora, chicken korma, chicken tikka masala, chicken tikka balti, 2 rice, 1 garlic naan, poppadoms and spicy onion."],
    ["Meal 4", 39.5, "Mix pakora, any 4 curries, 2 rice, large chips and 2 naan bread."],
  ] },
  { id: "milkshakes", name: "Milkshakes", items: [
    ["Kinder Milkshake 591ml", 4.95, "Kinder milkshake."],
    ["Toffee Milkshake 591ml", 4.95, "Toffee milkshake."],
    ["Vanilla Milkshake 591ml", 4.95, "Vanilla milkshake."],
    ["Chocolate Milkshake 591ml", 4.95, "Chocolate milkshake."],
    ["Banana Milkshake 591ml", 4.95, "Banana milkshake."],
    ["Mango Lassi Milkshake 591ml", 4.95, "Mango lassi milkshake."],
    ["Vanilla Lassi Milkshake 591ml", 4.95, "Vanilla lassi milkshake."],
    ["Strawberry Lassi Milkshake 591ml", 4.95, "Strawberry lassi milkshake."],
    ["Cookies and Cream Milkshake 591ml", 4.95, "Cookies and cream milkshake."],
    ["Strawberry Milkshake 591ml", 4.95, "Strawberry milkshake."],
    ["Mint Milkshake 591ml", 4.95, "Mint milkshake. Add a 90p bar (Kinder Bueno, Snickers, Mars, Biscoff or Maltesers)."],
  ] },
  { id: "desserts", name: "Desserts", items: [
    ["Cream Pots", 2.99, "Layered dessert with sponge fingers, cookies, mascarpone, sprinkles and toppings."],
    ["Gulab Jamun", 3.5, "Indian sweet dumplings."],
    ["Cookie Dough", 3.5, "Warm cookie dough dessert."],
    ["Fudge Cake Slice", 3.5, "Single slice of fudge cake."],
    ["Belgian Waffle", 3.5, "Belgian waffle with toppings."],
  ] },
  { id: "icecream", name: "Ice Cream Tubs", items: [
    ["2 Scoop Tub Fresh Ice Cream", 3.0, "Two scoops of fresh ice cream."],
    ["3 Scoop Tub Fresh Ice Cream", 4.0, "Three scoops of fresh ice cream."],
    ["Ben & Jerry's Cookie Dough 465ml", 5.95, "Vanilla ice cream with chocolate chip cookie dough chunks."],
    ["Ben & Jerry's Phish Food 465ml", 5.95, "Chocolate ice cream with marshmallow, caramel and chocolatey fish."],
    ["Ben & Jerry's Chocolate Fudge Brownie 465ml", 5.95, "Chocolate ice cream with brownie pieces."],
    ["Ben & Jerry's Spectacu-love 465ml", 5.95, "Sweet cream ice cream with caramel-cinnamon cookie chunks and swirls."],
  ] },
  { id: "nutella", name: "Nutella Pizza", items: [
    ["10\" Nutella Pizza", 5.0, "Sweet Nutella pizza. Add toppings for £1.00."],
  ] },
  { id: "kids", name: "Kids Menu", items: [
    ["Kids Fish Fingers (5pc)", 5.0, "Served with chips and juice."],
    ["Kids Chicken Nuggets (5pc)", 5.0, "Served with chips and juice."],
    ["Kids Donner Meat", 5.0, "Served with chips and juice."],
    ["Kids Roast Chicken", 5.0, "Served with chips and juice."],
    ["Kids Cheese Burger", 5.0, "Served with chips and juice."],
    ["Kids Chicken with Fried Rice", 5.0, "Served with chips and juice."],
    ["Kids Chicken Popcorn", 5.0, "Served with chips and juice."],
    ["Kids Chicken Fried Strips", 5.0, "Served with chips and juice."],
    ["Kids 10\" Wrap", 5.5, "Chips, donner or chicken in the wrap."],
    ["Kids 7\" Pizza", 6.5, "Mini 7\" pizza with chips and juice."],
  ] },
  { id: "drinks", name: "Drinks", items: [
    ["Dr Pepper 330ml", 1.5, "Sparkling sugar & sweetener soft drink."],
    ["Dr Pepper Zero Cherry Crush 330ml", 1.5, "Low calorie cherry flavour with sweeteners."],
    ["Glass Mirinda", 1.7, "Glass bottle of Mirinda."],
    ["Cans 330ml", 1.3, "Pepsi, Pepsi Max, Coca-Cola, Diet Coke, Sprite, Fanta Lemon and Tango Zero."],
    ["Rockstar Original 500ml", 1.5, "Carbonated energy drink with caffeine and B-vitamins."],
    ["Monster Energy 500ml", 2.0, "Carbonated energy drink with taurine and caffeine."],
    ["Red Bull 250ml", 2.0, "Original Red Bull energy drink."],
    ["Bottles (1.5L / 2L)", 3.0, "Coke, Diet Coke, 7Up, Vimto or Irn Bru."],
  ] },
];

function formatPrice(n) { return `£${Number(n).toFixed(2)}`; }
function makeFlatItems(menuCategories) { return menuCategories.flatMap((cat) => cat.items.map(([name, price, desc]) => ({ id: `${cat.id}-${name}`, category: cat.name, name, price, desc }))); }
function filterMenuItems(items, selectedCategory, query) { const q = query.trim().toLowerCase(); return items.filter((item) => (selectedCategory === "all" || item.category === selectedCategory) && (!q || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))); }
function calculateCartTotal(cart) { return cart.reduce((sum, item) => sum + item.price * item.qty, 0); }
function addItemToCart(cart, item) { const exists = cart.find((x) => x.id === item.id); return exists ? cart.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...cart, { ...item, qty: 1 }]; }
function changeItemQuantity(cart, id, amount) { return cart.map((x) => x.id === id ? { ...x, qty: x.qty + amount } : x).filter((x) => x.qty > 0); }
function runSelfTests() { const sample = makeFlatItems(categories); console.assert(formatPrice(2.2) === "£2.20", "formatPrice should show two decimals"); console.assert(sample.length > 20, "menu should flatten products"); console.assert(filterMenuItems(sample, "Pizzas", "margherita").every((x) => x.category === "Pizzas"), "category filter works"); console.assert(addItemToCart(addItemToCart([], sample[0]), sample[0])[0].qty === 2, "cart increments"); console.assert(changeItemQuantity([{ ...sample[0], qty: 1 }], sample[0].id, -1).length === 0, "cart removes at zero"); console.assert(calculateCartTotal([{ price: 4.5, qty: 2 }]) === 9, "total works"); }
runSelfTests();

function Icon({ name, size = 20, className = "" }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": true };
  const paths = {
    bag: <><path d="M6 8h12l-1 13H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></>, menu: <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>, x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>, plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>, minus: <path d="M5 12h14" />, trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>, phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z" /></>, pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>, clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>, search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, star: <path d="m12 2 3 6 6.5 1-4.7 4.6 1.1 6.4L12 17l-5.8 3 1.1-6.4L2.6 9 9 8l3-6Z" />, down: <path d="m6 9 6 6 6-6" />, mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>, send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></>, facebook: <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1Z" />, instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>, twitter: <path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.4-1.2 1.7-2.2-.8.5-1.7.8-2.6 1A4 4 0 0 0 12 8.8c0 .3 0 .6.1.9A11.4 11.4 0 0 1 3.8 5.5a4 4 0 0 0 1.2 5.4c-.6 0-1.2-.2-1.8-.5v.1a4 4 0 0 0 3.2 3.9c-.6.2-1.2.2-1.8.1a4 4 0 0 0 3.8 2.8A8.1 8.1 0 0 1 2 19.1a11.4 11.4 0 0 0 17.6-9.6v-.5c.8-.6 1.6-1.4 2.4-3.2Z" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Button({ children, className = "", variant = "solid", type = "button", ...props }) { return <button type={type} className={`inline-flex items-center justify-center transition disabled:opacity-60 ${variant === "outline" ? "border border-white/20 bg-black/30 text-white hover:bg-white hover:text-black" : ""} ${className}`} {...props}>{children}</button>; }
function Card({ children, className = "" }) { return <div className={`rounded-2xl border ${className}`}>{children}</div>; }
function CardContent({ children, className = "" }) { return <div className={className}>{children}</div>; }

export default function CaspianTakeawayWebsite() {
const [page, setPage] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [orderType, setOrderType] = useState("Collection");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });
  const [contactSent, setContactSent] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [user, setUser] = useState(() => getStoredUser());
    const [addresses, setAddresses] = useState(() => getStoredUser()?.addresses || []);
    const [authLoading, setAuthLoading] = useState(true);
    const flatItems = useMemo(() => makeFlatItems(categories), []);
  const filteredItems = useMemo(() => filterMenuItems(flatItems, selectedCategory, query), [flatItems, query, selectedCategory]);
  const total = calculateCartTotal(cart);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const go = (next) => { setPage(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
 const addToCart = (item) => {
  setCart((prev) => addItemToCart(prev, item));
  setPlaced(false);
};
 const changeQty = (id, amount) => { setCart((prev) => changeItemQuantity(prev, id, amount)); setPlaced(false); };
  const [checkoutClientSecret, setCheckoutClientSecret] = useState(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [settings, setSettings] = useState(null);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [theme, setTheme] = useState("dark");

useEffect(() => {
  async function restoreLogin() {
    const storedUser = getStoredUser();

    if (!storedUser) {
      setAuthLoading(false);
      return;
    }

    try {
      const freshUser = await userApi.me();
      setUser(freshUser);
      setAddresses(freshUser.addresses || []);
      setSession(localStorage.getItem("caspian_token"), freshUser);
    } catch (error) {
      clearSession();
      setUser(null);
      setAddresses([]);
    } finally {
      setAuthLoading(false);
    }
  }

  restoreLogin();
}, []);
useEffect(() => {
  settingsApi.get().then(setSettings).catch(console.error);
}, []);

// Detect Stripe return and verify the session (fallback for missing webhook).
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (!sessionId) return;

  paymentApi
    .verifySession(sessionId)
    .then((result) => {
      if (result.paymentStatus === "Paid" && result.orderId) {
        setPage("profile");
        setCart([]);
        setPlaced(true);
        setCheckoutMessage("Payment successful. Your order has been sent to the restaurant.");
      } else {
        setPage("menu");
        setCartOpen(true);
        setPlaced(false);
        setCheckoutMessage("Payment was not completed. Your basket is still here so you can try again.");
      }
    })
    .catch((err) => console.error("Could not verify Stripe session:", err))
    .finally(() => {
      // Clean the URL so refreshes don't re-trigger.
      window.history.replaceState({}, "", window.location.pathname);
    });
}, []);

useEffect(() => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
  });
}, []);

useEffect(() => {
  if (window.location.pathname === "/admin") {
    setPage("admin-login");
  }
}, []);


const [shopStatus, setShopStatus] = useState(null);
useEffect(() => {
  let cancelled = false;
  async function loadStatus() {
    try {
      const data = await settingsApi.shopStatus();
      if (!cancelled) setShopStatus(data);
    } catch (err) {
      console.error(err);
    }
  }
  loadStatus();
  const id = setInterval(loadStatus, 60000);
  return () => { cancelled = true; clearInterval(id); };
}, []);
if (authLoading) {
  return (
    <div className="min-h-screen bg-[#080808] text-white grid place-items-center">
      Loading...
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-orange-500/40">
      <Header page={page} go={go} count={count} user={user} settings={settings} shopStatus={shopStatus} setAuthMode={setAuthMode} setCartOpen={setCartOpen} setMobileOpen={setMobileOpen}/>
      {mobileOpen && <MobileNav go={go} user={user} setMobileOpen={setMobileOpen} />}
      <main>
      {page === "home" && <HomePage go={go} settings={settings} shopStatus={shopStatus} />}
        {page === "menu" && <MenuPage query={query} setQuery={setQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} filteredItems={filteredItems} addToCart={addToCart} />}
        {page === "about" && <AboutPage go={go} />}
        {page === "contact" && <ContactPage contactSent={contactSent} setContactSent={setContactSent} settings={settings} />}
        {page === "auth" && <AuthPage authMode={authMode} setAuthMode={setAuthMode} setUser={setUser} setAddresses={setAddresses} go={go} />}
        {page === "profile" && <ProfilePage user={user} setUser={setUser} addresses={addresses} setAddresses={setAddresses} go={go} setAuthMode={setAuthMode} />}
{page === "admin-login" && (
  <AdminLogin go={go} setUser={setUser} />
)}
 {page === "admin" && (
  <AdminDashboard
    user={user}
    go={go}
  />
)}
      {page === "checkout" && (
 <CheckoutPage
  clientSecret={checkoutClientSecret}
  go={go}
  cart={cart}
  total={total}
  orderType={orderType}
  customer={customer}
/>
)}
      </main>
    <Footer go={go} user={user} settings={settings} />
  {cartOpen && (
  <CartDrawer
    user={user}
    addresses={addresses}
    go={go}
    cart={cart}
    setCart={setCart}
    setCartOpen={setCartOpen}
    total={total}
    changeQty={changeQty}
    orderType={orderType}
    setOrderType={setOrderType}
    customer={customer}
    setCustomer={setCustomer}
    placed={placed}
    setPlaced={setPlaced}
  setCheckoutClientSecret={setCheckoutClientSecret}
  checkoutMessage={checkoutMessage}
  setCheckoutMessage={setCheckoutMessage}
  shopStatus={shopStatus}
  settings={settings}
/>
)}    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800;900&display=swap');

body { font-family: 'Inter', sans-serif; }
h1,h2,h3,h4,h5,h6,.font-serif { font-family: 'Playfair Display', serif; }

@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(500px)}to{transform:translateX(0)}}
`}</style>
    </div>
  );
}
function CheckoutPage({ clientSecret, go, cart = [], total = 0, orderType, customer }) {
  if (!clientSecret) {
    return (
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-40 text-center">
        <h1 className="font-serif text-5xl font-black">No checkout session</h1>
        <Button onClick={() => go("menu")} className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-black text-white">
          Back to Menu
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 lg:px-8">
      <div className="mb-8 text-center">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">
          Secure payment
        </p>
        <h1 className="font-serif text-5xl font-black text-white md:text-6xl">
          Secure Checkout
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/60">
          Review your order and complete payment securely.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
        <div className="rounded-[2rem] border border-white/10 bg-[#101010] p-6">
          <h2 className="font-serif text-3xl font-black text-white">
            Order Summary
          </h2>

          <div className="mt-5 space-y-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-black text-white">{item.name}</h3>
                    <p className="mt-1 text-sm text-white/50">
                      {item.qty} × £{Number(item.price).toFixed(2)}
                    </p>
                  </div>

                  <p className="font-black text-[#ff5b00]">
                    £{Number(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex justify-between text-2xl font-black">
              <span>Total</span>
              <span className="text-[#ff5b00]">
                £{Number(total).toFixed(2)}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-black/30 p-4 text-white/60">
              <p><b className="text-white">Type:</b> {orderType}</p>
              <p><b className="text-white">Name:</b> {customer?.name}</p>
              <p><b className="text-white">Phone:</b> {customer?.phone}</p>

              {orderType === "Delivery" && (
                <p className="mt-2">
                  <b className="text-white">Address:</b> {customer?.address}
                </p>
              )}

              {customer?.notes && (
                <p className="mt-2">
                  <b className="text-white">Notes:</b> {customer.notes}
                </p>
              )}
            </div>

            <button
              onClick={() => go("menu")}
              className="mt-5 w-full rounded-full border border-white/10 px-5 py-4 font-black text-white hover:border-[#ff5b00] hover:text-[#ff5b00]"
            >
              Back to Menu
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white p-4 shadow-2xl shadow-black/40 md:p-6">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </section>
  );
}
function Header({ page, go, count, user, settings, shopStatus, setAuthMode, setCartOpen, setMobileOpen }) {
  const links = [["Home", "home"], ["Menu", "menu"], ["About", "about"], ["Contact", "contact"]];
  const openAuth = (mode) => {
    setAuthMode(mode);
    go("auth");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      {shopStatus && (
        <div
          data-testid="shop-status-bar"
          className={`px-5 py-1.5 text-center text-xs font-bold uppercase tracking-[0.18em] ${
            shopStatus.isOpen
              ? "bg-emerald-600/20 text-emerald-200"
              : "bg-red-600/20 text-red-200"
          }`}
        >
          {shopStatus.isOpen ? (
            <>
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Open now · closes {shopStatus.closesAt ? new Date(shopStatus.closesAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
            </>
          ) : (
            <>
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400" />
              We are currently closed
              {shopStatus.nextOpenAt && (
                <> · opens {new Date(shopStatus.nextOpenAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</>
              )}
              {shopStatus.acceptScheduledOrders && " · pre-order available"}
            </>
          )}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <button
          onClick={() => go("home")}
          className="flex items-center gap-3 text-left"
        >
          <img
            src="/caspian_logo.jpg"
            alt="Caspian Tandoori"
            className="h-11 w-11 rounded-full border border-[#ff5b00]/40 object-cover"
          />

          <span className="font-serif text-3xl font-black tracking-tight">
            {settings?.restaurantName || "Caspian Tandoori"}
          </span>
        </button>

        <nav className="hidden items-center gap-9 text-sm font-semibold md:flex">
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={`rounded px-1.5 py-1 transition ${
                page === id
                  ? "border border-white/50 text-[#ff5b00]"
                  : "text-white/80 hover:text-[#ff5b00]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => go("profile")}
              className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 py-2 pl-2 pr-4 text-sm font-bold text-white/85 hover:border-[#ff5b00] hover:text-[#ff5b00] sm:flex"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ff5b00] text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              {user.name}
            </button>
          ) : (
            <button
              onClick={() => openAuth("signin")}
              className="hidden rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white/80 hover:border-[#ff5b00] hover:text-[#ff5b00] sm:block"
            >
              Sign In
            </button>
          )}

          {user?.role === "admin" && (
            <button
              onClick={() => go("admin")}
              className="rounded-full border border-[#ff5b00]/40 px-5 py-3 text-sm font-bold text-[#ff5b00] hover:bg-[#ff5b00] hover:text-white sm:block"
            >
              Admin
            </button>
          )}

          <button
            onClick={() => setCartOpen(true)}
            className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/30 bg-black/25 text-white transition hover:border-[#ff5b00] hover:text-[#ff5b00]"
            aria-label="Open basket"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.5L23 6H6" />
            </svg>

            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#ff5b00] text-xs font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <Button
            onClick={() => go("menu")}
            className="hidden rounded-full bg-[#ff5b00] px-7 py-4 text-base font-bold text-white hover:bg-orange-600 sm:flex"
          >
            Order Now
          </Button>

          <button onClick={() => setMobileOpen(true)} className="md:hidden">
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </header>
  );
}
function MobileNav({ go, user, setMobileOpen }) {
  const links = [
    {
      label: "Home",
      id: "home",
      desc: "Go to homepage",
      icon: "star",
    },
    {
      label: "Menu",
      id: "menu",
      desc: "Explore our menu",
      icon: "menu",
    },
    {
      label: "About",
      id: "about",
      desc: "Our story & values",
      icon: "star",
    },
    {
      label: "Contact",
      id: "contact",
      desc: "Get in touch with us",
      icon: "phone",
    },
    {
      label: user ? "My Account" : "Sign In",
      id: user ? "profile" : "auth",
      desc: user ? "Manage your profile" : "Login to continue",
      icon: "star",
      active: !!user,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#050505]/98 backdrop-blur-2xl md:hidden">

      {/* HEADER */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/70 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">

          <div>
            <h1 className="font-serif text-3xl font-black tracking-tight">
              Caspian{" "}
              <span className="text-[#ff5b00]">
                Tandoori
              </span>
            </h1>

            <p className="mt-1 text-[10px] uppercase tracking-[4px] text-orange-400/80">
              Indian & Pizza Takeaway
            </p>
          </div>

          <div className="flex items-center gap-2">

            {/* CART */}
            <button
              onClick={() => {
                setMobileOpen(false);
                go("cart");
              }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <Icon name="bag" className="h-5 w-5" />
            </button>

            {/* CLOSE */}
            <button
              onClick={() => setMobileOpen(false)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 pb-10 pt-5">

        {/* LINKS */}
        <div className="space-y-3">
          {links.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMobileOpen(false);
                go(item.id);
              }}
              className={`group relative flex w-full items-center justify-between overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300 ${
                item.active
                  ? "border-orange-500/60 bg-gradient-to-r from-orange-500/20 to-orange-500/5 shadow-[0_0_25px_rgba(255,91,0,0.12)]"
                  : "border-white/10 bg-white/[0.02] hover:border-orange-500/30 hover:bg-white/[0.04]"
              }`}
            >

              <div className="flex items-center gap-4">

                {/* ICON */}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    item.active
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-orange-500/10 text-orange-400"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className="h-5 w-5"
                  />
                </div>

                {/* TEXT */}
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    {item.label}
                  </h3>

                  <p className="mt-1 text-sm text-white/60">
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2">

                {item.active && (
                  <div className="rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                    Logged In
                  </div>
                )}

                <div className="text-white/40 transition group-hover:translate-x-1 group-hover:text-orange-400">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ADMIN */}
        {user?.role === "admin" && (
          <>
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/20" />

              <span className="text-xs font-bold uppercase tracking-[4px] text-orange-400/80">
                Admin Panel
              </span>

              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/20" />
            </div>

            <button
              onClick={() => {
                setMobileOpen(false);
                go("admin");
              }}
              className="group flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.02] p-4 transition hover:border-orange-500/30 hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                  <Icon
                    name="star"
                    className="h-5 w-5"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">
                    Admin
                  </h3>

                  <p className="mt-1 text-sm text-white/60">
                    Dashboard & tools
                  </p>
                </div>
              </div>

              <div className="text-white/40 group-hover:text-orange-400">
                →
              </div>
            </button>
          </>
        )}

        {/* CTA */}
        <div className="relative mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5">

          <div className="relative z-10">

            <div className="flex items-center gap-4">

              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop"
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-4 ring-orange-500/20"
              />

              <div>
                <h3 className="font-serif text-2xl font-black leading-tight">
                  Craving something{" "}
                  <span className="text-[#ff5b00]">
                    delicious?
                  </span>
                </h3>

                <p className="mt-2 text-sm text-white/70">
                  Order your favorite dishes now!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setMobileOpen(false);
                go("menu");
              }}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff5b00] px-6 py-4 text-lg font-bold text-white transition hover:scale-[1.02] hover:bg-[#ff6a1a]"
            >
              <Icon name="bag" className="h-5 w-5" />
              Order Now
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 flex flex-col items-center justify-center gap-5 pb-6">

          <div className="flex items-center gap-6 text-white/70">

            <a href="#" className="hover:text-orange-400">
              <Icon name="facebook" />
            </a>

            <a href="#" className="hover:text-orange-400">
              <Icon name="instagram" />
            </a>

            <a href="#" className="hover:text-orange-400">
              <Icon name="phone" />
            </a>
          </div>

          <p className="text-center text-xs text-white/40">
            © 2025 Caspian Tandoori
            <br />
            All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}function HomePage({ go, shopStatus }) {
  return <><section className="relative min-h-screen overflow-hidden pt-24"><div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(255,91,0,.22),transparent_33%),linear-gradient(90deg,#050505_0%,rgba(0,0,0,.86)_31%,rgba(0,0,0,.45)_100%)]" /><div className="absolute inset-0 opacity-80"><div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center mix-blend-screen" /><div className="absolute inset-0 bg-black/55" /></div><div className="relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center px-5 lg:px-8"><div className="max-w-2xl animate-[fadeUp_.7s_ease-out_both]"><p className="mb-6 text-sm font-black uppercase tracking-[0.42em] text-[#ff5b00]">Indian & Pizza Takeaway</p><h1 className="
  font-serif
  font-bold
  leading-tight
  break-words
  text-4xl
  sm:text-5xl
  md:text-6xl
  lg:text-7xl
">
  Taste the <span className="text-[#ff5b00]">Extraordinary</span>
</h1><p className="mt-7 max-w-xl text-xl font-medium leading-8 text-white/85">From sizzling tandoori dishes to wood-fired style pizzas, experience flavours that transport you to culinary paradise.</p><div className="mt-10 flex flex-wrap gap-4"><Button onClick={() => go("menu")} className="rounded-full bg-[#ff5b00] px-9 py-5 text-lg font-bold text-white hover:bg-orange-600">Order Now</Button><Button onClick={() => go("menu")} variant="outline" className="rounded-full px-9 py-5 text-lg font-bold">View Menu</Button></div></div></div></section><section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="text-center"><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Why choose us</p><h2 className="font-serif text-5xl font-black">Fresh, Fast & Full of Flavour</h2></div><div className="mt-12 grid gap-6 md:grid-cols-3">{[["Fresh Ingredients", "Quality meats, fresh vegetables and authentic sauces prepared daily."], ["Collection & Delivery", "Quick takeaway ordering with a smooth basket and checkout."], ["Big Menu Choice", "Curries, pizzas, burgers, kebabs, tandoori, sides and desserts."]].map(([t,d]) => <div key={t} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8"><div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-[#ff5b00]/15 text-[#ff5b00]"><Icon name="star" /></div><h3 className="mb-3 text-2xl font-black">{t}</h3><p className="leading-7 text-white/65">{d}</p></div>)}</div></section><section className="border-y border-white/10 bg-white/[0.03]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-2 lg:px-8"><div className="overflow-hidden rounded-[2rem] border border-white/10"><img src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=1000&q=80" className="h-full min-h-[420px] w-full object-cover opacity-85" alt="takeaway food" /></div><div className="flex flex-col justify-center"><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Signature dishes</p><h2 className="font-serif text-5xl font-black leading-tight">Indian Classics & Takeaway Favourites</h2><p className="mt-6 text-lg leading-8 text-white/75">Enjoy chef specialities, Punjabi favourites, kormas, pizzas, grill burgers and kebabs in one professional online takeaway website.</p><Button onClick={() => go("menu")} className="mt-8 w-fit rounded-full bg-[#ff5b00] px-8 py-4 font-bold text-white">Explore Menu</Button></div></div></section><HomeFeaturedCategories go={go} /><HomeHowItWorks go={go} /><HomeSpecialOffer go={go} /><HomeTestimonials /></>;
}

function HomeFeaturedCategories({ go }) {
  const features = [["Chef Specialities", "Creamy masalas, bhunas and house favourites.", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80"], ["Fresh Pizzas", "Loaded pizzas with generous toppings and melted cheese.", "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80"], ["Kebabs & Wraps", "Donner, tikka and mixed kebabs served hot.", "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&q=80"]];
  return <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Popular categories</p><h2 className="font-serif text-5xl font-black">What customers love</h2></div><Button onClick={() => go("menu")} className="w-fit rounded-full bg-[#ff5b00] px-8 py-4 font-bold text-white">View Full Menu</Button></div><div className="grid gap-6 md:grid-cols-3">{features.map(([title, desc, img]) => <button key={title} onClick={() => go("menu")} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] text-left transition hover:-translate-y-1 hover:border-[#ff5b00]/60"><div className="h-56 overflow-hidden"><img src={img} alt={title} className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-110" /></div><div className="p-7"><h3 className="font-serif text-2xl font-black">{title}</h3><p className="mt-3 leading-7 text-white/60">{desc}</p><span className="mt-5 inline-block font-black text-[#ff5b00]">Order now →</span></div></button>)}</div></section>;
}

function HomeHowItWorks({ go }) {
  return <section className="border-y border-white/10 bg-white/[0.03]"><div className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="text-center"><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Easy ordering</p><h2 className="font-serif text-5xl font-black">How it works</h2></div><div className="mt-12 grid gap-6 md:grid-cols-4">{[["01", "Choose", "Browse the menu and pick your favourites."], ["02", "Add to basket", "Build your order for collection or delivery."], ["03", "Checkout", "Enter your details and order notes."], ["04", "Enjoy", "Collect or receive your food hot and fresh."]].map(([num, title, desc]) => <div key={num} className="rounded-[2rem] border border-white/10 bg-[#101010] p-7"><span className="text-4xl font-black text-[#ff5b00]">{num}</span><h3 className="mt-5 font-serif text-2xl font-black">{title}</h3><p className="mt-3 leading-7 text-white/60">{desc}</p></div>)}</div><div className="mt-10 text-center"><Button onClick={() => go("menu")} className="rounded-full bg-[#ff5b00] px-9 py-4 font-black text-white">Start Order</Button></div></div></section>;
}

function HomeSpecialOffer({ go }) {
  return <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="overflow-hidden rounded-[2.5rem] border border-[#ff5b00]/30 bg-[radial-gradient(circle_at_75%_30%,rgba(255,91,0,.32),transparent_35%),#101010] p-8 md:p-12"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center"><div><p className="mb-4 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Special offer</p><h2 className="font-serif text-5xl font-black leading-tight md:text-6xl">Family night made easier</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Create a basket with pizzas, curries, kebabs and sides — perfect for group orders and weekend takeaway nights.</p><Button onClick={() => go("menu")} className="mt-8 rounded-full bg-[#ff5b00] px-9 py-4 font-black text-white">Build Your Meal</Button></div><div className="rounded-[2rem] border border-white/10 bg-black/30 p-7"><div className="flex items-center justify-between border-b border-white/10 pb-5"><span className="font-black text-white/70">Recommended combo</span><span className="rounded-full bg-[#ff5b00] px-4 py-2 text-sm font-black">Popular</span></div><div className="mt-6 grid gap-4 text-white/70"><p>✓ 12 inch pizza</p><p>✓ Chicken tikka masala</p><p>✓ Donner kebab</p><p>✓ Chips and drinks</p></div></div></div></div></section>;
}

function HomeTestimonials() {
  return <section className="border-t border-white/10 bg-white/[0.03]"><div className="mx-auto max-w-7xl px-5 py-24 lg:px-8"><div className="text-center"><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Customer reviews</p><h2 className="font-serif text-5xl font-black">Loved by locals</h2></div><div className="mt-12 grid gap-6 md:grid-cols-3">{[["Amazing food", "The curry was rich, fresh and full of flavour. Ordering was simple too."], ["Best pizza night", "Great choice for the family. The site feels easy and premium."], ["Fast collection", "Basket and checkout are smooth. Exactly what a takeaway website needs."]].map(([title, text]) => <div key={title} className="rounded-[2rem] border border-white/10 bg-[#101010] p-7"><div className="mb-5 flex gap-1 text-[#ff5b00]">★★★★★</div><h3 className="font-serif text-2xl font-black">{title}</h3><p className="mt-4 leading-7 text-white/60">“{text}”</p></div>)}</div></div></section>;
}
function MenuPage({ query, setQuery, selectedCategory, setSelectedCategory, filteredItems, addToCart }) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8">
      <div className="mb-12">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">
          Order online
        </p>
        <h1 className="font-serif text-6xl font-black">Our Menu</h1>
        <p className="mt-5 max-w-2xl text-white/65">
          Browse the full takeaway menu. Add items to your basket for collection or delivery.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden h-fit rounded-2xl border border-white/10 bg-[#101010] p-5 lg:sticky lg:top-32 lg:block">
          <h3 className="mb-5 font-serif text-2xl font-black">Menu</h3>

          <div className="grid gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-xl px-4 py-3 text-left font-bold transition ${
                selectedCategory === "all"
                  ? "bg-[#ff5b00] text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              All
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-xl px-4 py-3 text-left font-bold transition ${
                  selectedCategory === cat.name
                    ? "bg-[#ff5b00] text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Icon
                name="search"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pizza, curry, kebab..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
              />
            </label>

            <label className="relative lg:hidden">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none rounded-full border border-white/10 bg-white/5 py-4 pl-5 pr-11 outline-none focus:ring-2 focus:ring-[#ff5b00]"
              >
                <option value="all" className="bg-black">
                  All categories
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} className="bg-black" value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Icon
                name="down"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
              />
            </label>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-3xl font-black">
              {selectedCategory === "all" ? "All Dishes" : selectedCategory}
            </h2>
            <p className="text-sm font-bold text-white/45">
              {filteredItems.length} items
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="border-white/10 bg-[#111]/90 text-white transition hover:-translate-y-1 hover:border-[#ff5b00]/70"
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#ff5b00]">
                        {item.category}
                      </p>
                      <h3 className="mt-1 text-xl font-black">{item.name}</h3>
                    </div>
                    <span className="rounded-full bg-[#ff5b00]/15 px-3 py-1 font-black text-[#ff8b3d]">
                      {formatPrice(item.price)}
                    </span>
                  </div>

                  <p className="min-h-12 text-sm leading-6 text-white/65">
                    {item.desc}
                  </p>

                  <Button
                    onClick={() => addToCart(item)}
                    className="mt-5 w-full rounded-full bg-white py-3 font-bold text-black hover:bg-[#ff5b00] hover:text-white"
                  >
                    <Icon name="plus" className="mr-2" /> Add to order
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
function AboutPage({ go }) { return <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">About us</p><h1 className="font-serif text-6xl font-black">The New Caspian Tandoori</h1><p className="mt-6 text-lg leading-8 text-white/70">A professional takeaway experience for Indian cuisine, artisan pizzas, kebabs and burgers. Fresh ingredients, authentic recipes and easy online ordering.</p></div><div className="mt-16 grid gap-8 lg:grid-cols-2"><img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80" className="h-[430px] w-full rounded-[2rem] object-cover opacity-90" alt="food" /><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10"><h2 className="font-serif text-4xl font-black">Made for modern takeaway</h2><p className="mt-5 leading-8 text-white/65">This website includes separate pages, basket ordering, contact form, map area, professional footer and a polished dark orange interface matching the Caspian brand.</p><Button onClick={() => go("menu")} className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-bold text-white">Order Food</Button></div></div></section>; }

function AuthPage({ authMode, setAuthMode, setUser, setAddresses, go }) {
  const isSignup = authMode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  async function submit(e) {
  e.preventDefault();
  setError("");

  try {
    if (isSignup && form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }

    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    const data = isSignup
      ? await authApi.signup({
          name: form.name,
          email: form.email,
          password: form.password,
        })
      : await authApi.signin({
          email: form.email,
          password: form.password,
        });

    if (!data?.token || !data?.user) {
      return setError("Server returned an unexpected response. Please contact support.");
    }

    setSession(data.token, data.user);
    setUser(data.user);
    setAddresses(data.user.addresses || []);
    go(data.user.role === "admin" ? "admin" : "profile");

  } catch (err) {
    console.error("Auth error:", err);
    setError(err.message || "Could not sign in. Please try again.");
  }
}
 async function googleAuth() {
  try {
    setError("");

    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const googleUser = result.user;

    const data = await authApi.google({
      name: googleUser.displayName,
      email: googleUser.email,
    });

    setSession(data.token, data.user);
    setUser(data.user);
    setAddresses(data.user.addresses || []);
    go("profile");
  } catch (err) {
    setError(err.message);
  }
}
  return <section className="relative overflow-hidden px-5 pb-24 pt-40 lg:px-8"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,91,0,.18),transparent_30%)]" /><div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_520px] lg:items-center"><div><p className="mb-5 text-sm font-black uppercase tracking-[0.42em] text-[#ff5b00]">Customer account</p><h1 className="font-serif text-6xl font-black leading-tight md:text-7xl">{isSignup ? "Create your account" : "Welcome back"}</h1><p className="mt-6 max-w-xl text-xl leading-8 text-white/70">Sign in to place faster orders, save your details, track favourites and enjoy a smoother takeaway experience.</p><div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">{["Fast checkout", "Saved orders", "Secure access"].map((x) => <div key={x} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 font-bold"><Icon name="star" className="mb-3 text-[#ff5b00]" />{x}</div>)}</div></div><div className="rounded-[2rem] border border-white/10 bg-[#101010]/95 p-8 shadow-2xl shadow-black/40"><div className="mb-6 rounded-2xl border border-[#ff5b00]/30 bg-[#ff5b00]/10 p-4 text-sm font-bold text-orange-100">
  Please sign in or create an account to place your order.
</div><div className="mb-7 grid grid-cols-2 rounded-full bg-white/5 p-1"><button onClick={() => { setAuthMode("signin"); setError(""); }} className={`rounded-full py-3 font-black ${!isSignup ? "bg-[#ff5b00] text-white" : "text-white/60"}`}>Sign In</button><button onClick={() => { setAuthMode("signup"); setError(""); }} className={`rounded-full py-3 font-black ${isSignup ? "bg-[#ff5b00] text-white" : "text-white/60"}`}>Sign Up</button></div><h2 className="font-serif text-3xl font-black">{isSignup ? "Join Caspian" : "Sign in to Caspian"}</h2><button onClick={googleAuth} className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white px-5 py-4 font-black text-black transition hover:bg-white/90"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-lg font-black text-[#4285F4]">G</span>{isSignup ? "Sign up with Google" : "Continue with Google"}</button><div className="my-6 flex items-center gap-4 text-sm text-white/40"><span className="h-px flex-1 bg-white/10" />or use email<span className="h-px flex-1 bg-white/10" /></div><form onSubmit={submit} className="grid gap-5">{isSignup && <Field label="Full Name *" placeholder="John Doe" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}<Field label="Email Address *" placeholder="john@example.com" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Field label="Password *" placeholder="••••••••" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />{isSignup && <Field label="Confirm Password *" placeholder="••••••••" required type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />}{!isSignup && <div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-white/60"><input type="checkbox" className="accent-[#ff5b00]" /> Remember me</label><button type="button" className="font-bold text-[#ff5b00]">Forgot password?</button></div>}{error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<Button type="submit" className="rounded-full bg-[#ff5b00] py-4 text-lg font-black text-white hover:bg-orange-600">{isSignup ? "Create Account" : "Sign In"}</Button></form><p className="mt-6 text-center text-sm text-white/55">{isSignup ? "Already have an account?" : "New to Caspian?"} <button onClick={() => setAuthMode(isSignup ? "signin" : "signup")} className="font-black text-[#ff5b00]">{isSignup ? "Sign in" : "Create account"}</button></p></div></div></section>;
}

function ProfilePage({ user, setUser, addresses, setAddresses, go, setAuthMode }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [addressForm, setAddressForm] = useState({ label: "Home", line1: "", line2: "", city: "", postcode: "", instructions: "" });
useEffect(() => {
  if (!user) return;
  async function loadMyOrders() {
    try {
      const orders = await orderApi.myOrders();
      setMyOrders(orders);
    } catch (err) {
      console.error(err.message || "Could not load order history");
    } finally {
      setOrdersLoading(false);
    }
  }
  setOrdersLoading(true);
  loadMyOrders();
  const id = setInterval(loadMyOrders, 20000);
  return () => clearInterval(id);
}, [user]);
  if (!user) return <section className="mx-auto max-w-4xl px-5 pb-24 pt-40 text-center"><h1 className="font-serif text-6xl font-black">Please sign in</h1><p className="mt-5 text-white/60">You need an account to view your profile.</p><Button onClick={() => { setAuthMode("signin"); go("auth"); }} className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-black text-white">Sign In</Button></section>;

  const saveProfile = async (e) => {
  e.preventDefault();

  try {
    const updatedUser = await userApi.updateMe(profileForm);

    setUser(updatedUser);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  } catch (err) {
    alert(err.message || "Profile could not be saved.");
  }
};
  const addAddress = async (e) => {
  e.preventDefault();

  try {
    const updatedAddresses = await userApi.addAddress(addressForm);

    setAddresses(updatedAddresses);
    setAddressForm({
      label: "Home",
      line1: "",
      line2: "",
      city: "",
      postcode: "",
      instructions: "",
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  } catch (err) {
    alert(err.message || "Address could not be saved.");
  }
};

  return <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><div className="mb-10 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,91,0,.22),transparent_35%),#101010] p-8 lg:p-10"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-5"><div className="grid h-20 w-20 place-items-center rounded-full bg-[#ff5b00] text-3xl font-black text-white">{user.name.slice(0,1).toUpperCase()}</div><div><p className="text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">My account</p><h1 className="mt-2 font-serif text-5xl font-black">{user.name}</h1><p className="mt-2 text-white/60">{user.email}{user.provider ? ` · Signed in with ${user.provider}` : ""}</p></div></div><div className="flex flex-wrap gap-3"><Button onClick={() => setEditing(true)} className="rounded-full bg-white px-7 py-4 font-black text-black hover:bg-[#ff5b00] hover:text-white">Edit Profile</Button><Button onClick={() => go("menu")} className="rounded-full bg-[#ff5b00] px-7 py-4 font-black text-white">Order Now</Button><Button
  onClick={() => {
    clearSession();
    setUser(null);
    setAddresses([]);
    setAuthMode("signin");
    go("home");
  }}
  variant="outline"
  className="rounded-full px-7 py-4 font-black"
>
  Sign Out
</Button></div></div>{saved && <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-200">Saved successfully.</div>}</div>

  <div className="grid gap-6 lg:grid-cols-3"><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 lg:col-span-2"><div className="flex items-center justify-between gap-4"><h2 className="font-serif text-2xl font-black">Account Details</h2>{!editing && <button onClick={() => setEditing(true)} className="font-black text-[#ff5b00]">Edit</button>}</div>{editing ? <form onSubmit={saveProfile} className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Full Name" required value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /><Field label="Email Address" required type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /><Field label="Phone Number" placeholder="07123 456789" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /><div className="flex items-end gap-3"><Button type="submit" className="rounded-full bg-[#ff5b00] px-7 py-4 font-black text-white">Save Details</Button><Button onClick={() => { setEditing(false); setProfileForm({ name: user.name, email: user.email, phone: user.phone || "" }); }} variant="outline" className="rounded-full px-7 py-4 font-black">Cancel</Button></div></form> : <div className="mt-6 grid gap-4 text-white/70 md:grid-cols-2"><p><b className="text-white">Name:</b> {user.name}</p><p><b className="text-white">Email:</b> {user.email}</p><p><b className="text-white">Phone:</b> {user.phone || "Not added"}</p><p><b className="text-white">Status:</b> Active customer</p></div>}</div><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"><h2 className="font-serif text-2xl font-black">Loyalty</h2><p className="mt-6 text-4xl font-black text-[#ff5b00]">0 pts</p><p className="mt-2 text-white/60">Start ordering to collect points.</p></div></div>

  <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]"><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7"><h2 className="font-serif text-2xl font-black">Saved Addresses</h2>{addresses.length === 0 ? <p className="mt-6 leading-7 text-white/65">No saved address yet. Add one below for faster delivery checkout.</p> : <div className="mt-6 grid gap-4">{addresses.map((address) => <div key={address.id} className="rounded-2xl border border-white/10 bg-black/25 p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-[#ff5b00]">{address.label}</h3><p className="mt-2 leading-7 text-white/70">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.postcode}</p>{address.instructions && <p className="mt-2 text-sm text-white/45">Note: {address.instructions}</p>}</div><button
  onClick={async () => {
    try {
      const updatedAddresses = await userApi.deleteAddress(address._id);
      setAddresses(updatedAddresses);
    } catch (err) {
      alert(err.message || "Address could not be deleted.");
    }
  }}
  className="text-white/40 hover:text-red-400"><Icon name="trash" /></button></div></div>)}</div>}</div><div className="rounded-[2rem] border border-white/10 bg-[#101010] p-7"><h2 className="font-serif text-2xl font-black">Add Delivery Address</h2><form onSubmit={addAddress} className="mt-6 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Label" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} /><Field label="Postcode *" required placeholder="KY4 0AA" value={addressForm.postcode} onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })} /></div><Field label="Address Line 1 *" required placeholder="26 Main Street" value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} /><Field label="Address Line 2" placeholder="Flat, building, landmark" value={addressForm.line2} onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })} /><Field label="Town / City *" required placeholder="Kelty" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /><label className="grid gap-2 text-sm font-bold">Delivery Instructions<textarea placeholder="Leave at door, call on arrival..." value={addressForm.instructions} onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })} className="min-h-24 rounded-lg border border-white/10 bg-white/7 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]" /></label><Button type="submit" className="rounded-full bg-[#ff5b00] py-4 font-black text-white">Save Address</Button></form></div></div>

  <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
  <div className="flex items-center justify-between gap-4">
    <h2 className="font-serif text-2xl font-black">Order History</h2>
    <Button
      onClick={() => go("menu")}
      className="rounded-full bg-[#ff5b00] px-5 py-3 font-black text-white"
    >
      New Order
    </Button>
  </div>

  {ordersLoading ? (
    <p className="mt-6 text-white/60">Loading orders...</p>
  ) : myOrders.length === 0 ? (
    <p className="mt-6 leading-7 text-white/65">
      You have not placed any orders yet.
    </p>
  ) : (
    <div className="mt-6 grid gap-4">
      {myOrders.map((order) => (
        <div
          key={order._id}
          data-testid={`my-order-${order._id}`}
          className="rounded-2xl border border-white/10 bg-black/25 p-5"
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-serif text-2xl font-black">
                  Order #{order._id.slice(-6).toUpperCase()}
                </h3>

                <span
                  data-testid={`order-status-${order._id}`}
                  className="rounded-full bg-[#ff5b00]/15 px-3 py-1 text-sm font-black text-[#ff8b3d]"
                >
                  {order.status}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/60">
                  {order.orderType}
                </span>
              </div>

              <p className="mt-2 text-sm text-white/45">
                {new Date(order.createdAt).toLocaleString()}
              </p>

              <OrderStatusTracker order={order} />

              <div className="mt-4 grid gap-2 text-white/70">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between gap-4">
                    <span>
                      {item.qty} × {item.name}
                    </span>
                    <span>
                      £{Number(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {(order.deliveryFee > 0 || order.subtotal > 0) && (
                <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/55">
                  {order.subtotal > 0 && <p>Subtotal: £{Number(order.subtotal).toFixed(2)}</p>}
                  {order.deliveryFee > 0 && <p>Delivery ({order.deliveryArea || "delivery"}): £{Number(order.deliveryFee).toFixed(2)}</p>}
                </div>
              )}

              {order.notes && (
                <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-white/55">
                  Notes: {order.notes}
                </p>
              )}
            </div>

            <div className="text-left md:text-right">
              <p className="text-2xl font-black text-[#ff5b00]">
                £{Number(order.total).toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-white/45">
                Payment: {order.paymentStatus || "Pending"}
              </p>
              {order.scheduledFor && (
                <p className="mt-2 text-xs text-white/45">
                  Scheduled: {new Date(order.scheduledFor).toLocaleString("en-GB")}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
</section>;
}
function OrderStatusTracker({ order }) {
  const isCollection = order.orderType === "Collection";
  const steps = isCollection
    ? ["Pending", "Accepted", "Preparing", "Ready", "Completed"]
    : ["Pending", "Accepted", "Preparing", "Out for delivery", "Delivered"];

  if (order.status === "Cancelled") {
    return (
      <div data-testid={`status-tracker-${order._id}`} className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
        This order was cancelled.
      </div>
    );
  }

  let currentIndex = steps.indexOf(order.status);
  if (order.status === "Completed" || order.status === "Delivered") currentIndex = steps.length - 1;
  if (currentIndex < 0) currentIndex = 0;

  let etaText = "";
  if (order.estimatedReadyAt && !["Completed", "Delivered", "Cancelled"].includes(order.status)) {
    const remainingMs = new Date(order.estimatedReadyAt).getTime() - Date.now();
    if (remainingMs > 0) {
      const mins = Math.max(1, Math.round(remainingMs / 60000));
      etaText = isCollection ? `Ready in about ${mins} min` : `Arriving in about ${mins} min`;
    } else {
      etaText = isCollection ? "Should be ready any minute" : "On its way to you";
    }
  }

  return (
    <div data-testid={`status-tracker-${order._id}`} className="mt-4 rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const reached = idx <= currentIndex;
          const isActive = idx === currentIndex;
          return (
            <div key={step} className="flex flex-1 flex-col items-center">
              <div
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                  reached ? "bg-[#ff5b00] text-white" : "bg-white/10 text-white/40"
                } ${isActive ? "ring-2 ring-[#ff5b00]/60" : ""}`}
              >
                {idx + 1}
              </div>
              <span className={`mt-1 text-center text-[10px] font-bold ${reached ? "text-white" : "text-white/40"}`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
      {etaText && (
        <p className="mt-3 text-center text-sm font-black text-[#ff8b3d]">{etaText}</p>
      )}
    </div>
  );
}

function ContactPage({ contactSent, setContactSent }) { return <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="mb-5 text-sm font-black uppercase tracking-[0.42em] text-[#ff5b00]">Get in touch</p><h1 className="font-serif text-6xl font-black">Contact Us</h1><p className="mt-6 text-xl leading-8 text-white/70">Have a question or feedback? We'd love to hear from you. Reach out and we'll get back to you as soon as possible.</p></div><div className="mt-24 grid gap-12 lg:grid-cols-[1fr_1fr]"><div><div className="grid gap-5 sm:grid-cols-2"><ContactCard icon="pin" title="Address" text={<>26 Main Street<br />Kelty, KY4 0AA</>} /><ContactCard icon="phone" title="Phone" text="01383 830 166" /><ContactCard icon="mail" title="Email" text="hello@caspiantandoori.com" /><ContactCard icon="clock" title="Opening Hours" text={<>Mon-Thu: 4PM - 12AM<br />Fri-Sat: 4PM - 1AM</>} /></div><div className="mt-8 overflow-hidden rounded-2xl border border-white/10"><iframe title="Caspian map" src="https://maps.google.com/maps?q=Caspian Tandoori Kelty&output=embed" className="h-80 w-full border-0" loading="lazy" /></div></div><div className="rounded-[1.75rem] border border-white/10 bg-[#101010] p-8 lg:p-10"><h2 className="font-serif text-3xl font-black">Send us a Message</h2>{contactSent ? <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/10 p-5 text-green-200">Thanks — your message has been submitted in this demo.</div> : <form onSubmit={(e) => { e.preventDefault(); setContactSent(true); }} className="mt-7 grid gap-6"><Field label="Your Name *" placeholder="John Doe" required /><Field label="Email Address *" placeholder="john@example.com" required type="email" /><Field label="Phone Number (Optional)" placeholder="07123 456789" /><label className="grid gap-2 text-sm font-bold">Message *<textarea required placeholder="How can we help you?" className="min-h-36 rounded-lg border border-white/10 bg-white/7 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]" /></label><Button type="submit" className="rounded-full bg-[#ff5b00] py-4 font-black text-white hover:bg-orange-600"><Icon name="send" className="mr-3" /> Send Message</Button></form>}</div></div></section>; }
function Field({ label, ...props }) { return <label className="grid gap-2 text-sm font-bold">{label}<input {...props} className="rounded-xl border border-white/10 bg-[#0f0f0f] text-white placeholder:text-white/40 p-4 focus:outline-none focus:ring-2 focus:ring-[#ff5b00]" /></label>; }
function ContactCard({ icon, title, text }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7"><div className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-[#ff5b00]/15 text-[#ff5b00]"><Icon name={icon} size={28} /></div><h3 className="mb-3 font-serif text-xl font-black">{title}</h3><p className="leading-7 text-white/70">{text}</p></div>; }

function Footer({ go, user, settings }) {
    return <footer className="border-t bo   rder-white/10 bg-[#080808]">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-4 lg:px-8">
        <div><button onClick={() => go("home")} className="font-serif text-4xl font-black">{settings?.restaurantName || "Caspian Tandoori"}</button>
        <p className="mt-7 leading-7 text-white/60">Experience the finest Indian cuisine and artisan pizzas. Fresh ingredients, authentic recipes, delivered to your door.</p><div className="mt-7 flex gap-4"><Social icon="facebook" /><Social icon="instagram" /><Social icon="twitter" /></div></div><div><h3 className="mb-7 font-serif text-xl font-black">Quick Links</h3><div className="grid gap-4 text-white/60"><button onClick={() => go("menu")} className="text-left hover:text-[#ff5b00]">Our Menu</button><button onClick={() => go("about")} className="text-left hover:text-[#ff5b00]">About Us</button><button onClick={() => go("contact")} className="text-left hover:text-[#ff5b00]">Contact</button></div></div><div><h3 className="mb-7 font-serif text-xl font-black">Contact</h3><div className="grid gap-5 text-white/65"><p className="flex gap-4"><Icon name="pin" className="text-[#ff5b00]" /> <span>{settings?.address || "26 Main Street, Kelty, KY4 0AA"}</span></p><p className="flex gap-4"><Icon name="phone" className="text-[#ff5b00]" /> <span>{settings?.phone || "01383 830 166"}</span></p></div></div><div><h3 className="mb-7 font-serif text-xl font-black">Opening Hours</h3><div className="grid gap-5 text-white/65"><p className="flex gap-4"><Icon name="clock" className="text-[#ff5b00]" /> <span><b className="text-white">Mon - Thu, Sun</b><br />4:00 PM - 12:00 AM</span></p><p className="flex gap-4"><Icon name="clock" className="text-[#ff5b00]" /> <span><b className="text-white">Fri - Sat</b><br />4:00 PM - 1:00 AM</span></p></div></div></div><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-white/10 px-5 py-8 text-sm text-white/45 md:flex-row lg:px-8"><p>2026 Caspian Tandoori. All rights reserved.</p><p className="flex gap-8"><span>Privacy Policy</span><span>Terms of Service</span></p></div></footer>; }
function Social({ icon }) { return <button className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white/80 hover:bg-[#ff5b00] hover:text-white"><Icon name={icon} /></button>; }


function AdminDashboard_1({ user, go }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("orders");
  const [loading, setLoading] = useState(true);

  async function loadAdminData() {
    try {
      setLoading(true);
      const [dashboardData, ordersData, customersData] = await Promise.all([
        adminApi.dashboard(),
        adminApi.orders({ status, search }),
        adminApi.customers()
      ]);

      setStats(dashboardData);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (err) {
      alert(err.message || "Could not load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "admin") loadAdminData();
  }, [user, status]);

  async function updateStatus(orderId, nextStatus) {
    try {
      const updated = await adminApi.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((order) => (order._id === orderId ? updated : order)));
      const dashboardData = await adminApi.dashboard();
      setStats(dashboardData);
    } catch (err) {
      alert(err.message || "Could not update order status");
    }
  }
  function printOrder(order) {
    const receipt = `
CASPIAN TANDOORI
-----------------------------
Order #: ${order._id.slice(-6).toUpperCase()}
Date: ${new Date(order.createdAt).toLocaleString()}
Type: ${order.orderType}
Status: ${order.status}

Customer
Name: ${order.customerName}
Phone: ${order.phone}
${order.address ? `Address: ${typeof order.address === "string" ? order.address : JSON.stringify(order.address)}` : ""}

Items
${order.items.map((item) => `${item.qty} x ${item.name} - £${Number(item.price * item.qty).toFixed(2)}`).join("\n")}

Notes
${order.notes || "No notes"}

Total: £${Number(order.total).toFixed(2)}
-----------------------------
Thank you
`;

    const printWindow = window.open("", "_blank", "width=420,height=700");
    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt</title>
          <style>
            body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
            button { margin-top: 20px; padding: 10px 16px; }
          </style>
        </head>
        <body>
          <pre>${receipt}</pre>
          <button onclick="window.print()">Print</button>
        </body>
      </html>
    `);
    printWindow.document.close();
     }

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-40 text-center">
        <h1 className="font-serif text-6xl font-black">Admin Login Required</h1>
        <Button onClick={() => go("auth")} className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-black text-white">
          Sign In
        </Button>
      </section>
    );
  }

  if (user.role !== "admin") {
    return (
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-40 text-center">
        <h1 className="font-serif text-6xl font-black">Access Denied</h1>
        <p className="mt-5 text-white/60">Only admin users can access this dashboard.</p>
        <Button onClick={() => go("home")} className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-black text-white">
          Back Home
        </Button>
      </section>
    );
  }
   return (
    <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">Admin control panel</p>
          <h1 className="font-serif text-6xl font-black">Dashboard</h1>
          <p className="mt-4 text-white/60">Manage orders, customers, revenue and receipts.</p>
        </div>
        <Button onClick={loadAdminData} className="rounded-full bg-[#ff5b00] px-7 py-4 font-black text-white">
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat title="Today Orders" value={stats.todayOrders} />
          <AdminStat title="Today Revenue" value={`£${Number(stats.todayRevenue).toFixed(2)}`} />
          <AdminStat title="Pending" value={stats.pendingOrders} />
          <AdminStat title="Customers" value={stats.totalCustomers} />
        </div>
      )}
   <div className="mb-8 flex flex-wrap gap-3">
        {[
          ["orders", "Orders"],
          ["customers", "Customers"],
          ["reports", "Reports"]
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full px-6 py-3 font-black ${tab === id ? "bg-[#ff5b00] text-white" : "bg-white/10 text-white/65 hover:bg-white/15"}`}
          >
            {label}
          </button>
        ))}
      </div>
       {tab === "orders" && (
        <div>
          <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px_140px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer or phone..."
              className="rounded-full border border-white/10 bg-white/5 px-5 py-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
            >
              <option className="bg-black" value="all">All Status</option>
              {[
                "Pending",
                "Accepted",
                "Preparing",
                "Ready",
                "Completed",
                "Cancelled"
              ].map((s) => <option className="bg-black" key={s} value={s}>{s}</option>)}
            </select>
            <Button onClick={loadAdminData} className="rounded-full bg-white px-5 py-4 font-black text-black hover:bg-[#ff5b00] hover:text-white">
              Search
            </Button>
          </div>

          {loading ? (
            <p className="text-white/60">Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/60">No orders found.</div>
          ) : (
            <div className="grid gap-5">
              {orders.map((order) => (
                <AdminOrderCard key={order._id} order={order} updateStatus={updateStatus} printOrder={printOrder} />
              ))}
            </div>
          )}
        </div>
      )}
  {tab === "customers" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <div key={customer._id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="font-serif text-2xl font-black">{customer.name}</h3>
              <p className="mt-2 text-white/60">{customer.email}</p>
              <p className="mt-1 text-white/60">{customer.phone || "No phone"}</p>
              <p className="mt-4 text-sm text-white/40">Addresses: {customer.addresses?.length || 0}</p>
            </div>
          ))}
        </div>
      )}
{tab === "reports" && stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="font-serif text-3xl font-black">Sales Report</h2>
            <div className="mt-6 grid gap-4 text-white/70">
              <p>Total Orders: <b className="text-white">{stats.totalOrders}</b></p>
              <p>Total Revenue: <b className="text-white">£{Number(stats.totalRevenue).toFixed(2)}</b></p>
              <p>Completed Orders: <b className="text-white">{stats.completedOrders}</b></p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
            <h2 className="font-serif text-3xl font-black">Best Sellers</h2>
            <div className="mt-6 grid gap-3">
              {stats.bestSellingItems.map((item) => (
                <div key={item.name} className="flex justify-between rounded-xl bg-black/25 p-4">
                  <span>{item.name}</span>
                  <b className="text-[#ff5b00]">{item.qty} sold</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
     );
}

function AdminStat({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-bold uppercase tracking-widest text-white/45">{title}</p>
      <p className="mt-3 text-4xl font-black text-[#ff5b00]">{value}</p>
    </div>
  );
}
function AdminOrderCard({ order, updateStatus, printOrder }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#101010] p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-serif text-2xl font-black">Order #{order._id.slice(-6).toUpperCase()}</h3>
            <span className="rounded-full bg-[#ff5b00]/15 px-3 py-1 text-sm font-black text-[#ff8b3d]">{order.status}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white/60">{order.orderType}</span>
          </div>
          <p className="mt-2 text-white/45">{new Date(order.createdAt).toLocaleString()}</p>
          <div className="mt-5 grid gap-1 text-white/70">
            <p><b className="text-white">Customer:</b> {order.customerName}</p>
            <p><b className="text-white">Phone:</b> {order.phone}</p>
            {order.address && <p><b className="text-white">Address:</b> {typeof order.address === "string" ? order.address : JSON.stringify(order.address)}</p>}
          </div>
        </div>
        <div className="text-left lg:text-right">
          <p className="text-3xl font-black text-[#ff5b00]">£{Number(order.total).toFixed(2)}</p>
          <Button onClick={() => printOrder(order)} className="mt-4 rounded-full bg-white px-6 py-3 font-black text-black hover:bg-[#ff5b00] hover:text-white">
            Print Receipt
          </Button>
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-black/25 p-5">
        <h4 className="mb-4 font-black">Items</h4>
        <div className="grid gap-2">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-white/70">
              <span>{item.qty} × {item.name}</span>
              <span>£{Number(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {order.notes && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-white/60">Notes: {order.notes}</p>}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {["Accepted", "Preparing", "Ready", "Completed", "Cancelled"].map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => updateStatus(order._id, nextStatus)}
            className={`rounded-full px-5 py-2 text-sm font-black ${order.status === nextStatus ? "bg-[#ff5b00] text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}
          >
            {nextStatus}
          </button>
        ))}
      </div>
       </div>
  );
}


function CartDrawer({
  user,
  addresses = [],
  go,
  cart,
  setCart,
  setCartOpen,
  total,
  changeQty,
  orderType,
  setOrderType,
  customer,
  setCustomer,
  placed,
  setPlaced,
  setCheckoutClientSecret,
  checkoutMessage,
  setCheckoutMessage,
  shopStatus,
  settings,
}) {
  const formatAddress = (address) => {
    if (!address) return "";
    return [address.line1, address.line2, address.city, address.postcode]
      .filter(Boolean)
      .join(", ");
  };

  const savedDeliveryAddresses = addresses || [];

  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isOpen = shopStatus?.isOpen;
  const acceptsScheduled = shopStatus?.acceptScheduledOrders !== false;
  const minimumOrder = Number(settings?.minimumOrder || 0);

  // When closed, force scheduling.
  useEffect(() => {
    if (!isOpen && acceptsScheduled) setScheduleMode("schedule");
  }, [isOpen, acceptsScheduled]);

  // Debounced delivery quote when address changes (only for delivery).
  useEffect(() => {
    if (orderType !== "Delivery") {
      setDeliveryQuote(null);
      return;
    }
    const trimmed = (customer.address || "").trim();
    if (trimmed.length < 4) {
      setDeliveryQuote(null);
      return;
    }
    const id = setTimeout(async () => {
      try {
        setQuoteLoading(true);
        const quote = await settingsApi.deliveryQuote(trimmed);
        setDeliveryQuote(quote);
      } catch (err) {
        setDeliveryQuote({ deliverable: false, message: err.message || "Could not get delivery quote" });
      } finally {
        setQuoteLoading(false);
      }
    }, 450);
    return () => clearTimeout(id);
  }, [customer.address, orderType]);

  const selectSavedAddress = (address) => {
    setCustomer({
      ...customer,
      address: formatAddress(address),
      selectedAddressId: address._id,
    });
  };

  const deliveryFee = orderType === "Delivery" && deliveryQuote?.deliverable ? Number(deliveryQuote.fee || 0) : 0;
  const subtotal = total;
  const grandTotal = subtotal + deliveryFee;

  // Default scheduled time = next opening or now + 30m, formatted as datetime-local.
  function toDatetimeLocal(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  useEffect(() => {
    if (scheduledFor) return;
    const base = !isOpen && shopStatus?.nextOpenAt
      ? new Date(shopStatus.nextOpenAt)
      : new Date(Date.now() + 30 * 60 * 1000);
    setScheduledFor(toDatetimeLocal(base));
  }, [shopStatus, isOpen, scheduledFor]);

  async function submitOrder(e) {
    e.preventDefault();
    setError("");
    setCheckoutMessage("");

    if (!user) {
      setCartOpen(false);
      go("auth");
      return;
    }

    // Client-side guards
    if (!isOpen && (!acceptsScheduled || scheduleMode !== "schedule")) {
      setError("We are currently closed. Please pre-order for a later time.");
      return;
    }
    if (scheduleMode === "schedule" && !scheduledFor) {
      setError("Please choose a date and time for your order.");
      return;
    }
    if (orderType === "Delivery") {
      if (!deliveryQuote?.deliverable) {
        setError(deliveryQuote?.message || "Please enter a deliverable address.");
        return;
      }
      if (subtotal < minimumOrder) {
        setError(`Minimum delivery order is £${minimumOrder.toFixed(2)}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const data = await paymentApi.createCheckoutSession({
        customerName: customer.name || user?.name,
        phone: customer.phone || user?.phone,
        orderType,
        address: orderType === "Delivery" ? customer.address : null,
        items: cart.map((item) => ({
          name: item.name,
          price: item.price,
          qty: item.qty,
          category: item.category,
        })),
        notes: customer.notes,
        scheduledFor: scheduleMode === "schedule" ? new Date(scheduledFor).toISOString() : null,
      });

      setCheckoutClientSecret(data.clientSecret);
      setCartOpen(false);
      go("checkout");
    } catch (err) {
      setError(err.message || "Payment could not start.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/70" onClick={() => setCartOpen(false)}>
      <aside data-testid="cart-drawer" className="h-full w-full max-w-md animate-[slideIn_.24s_ease-out_both] overflow-y-auto bg-[#0d0d0d] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-3xl font-black">Your Order</h2>
          <button onClick={() => setCartOpen(false)} className="rounded-full border border-white/10 p-2" data-testid="cart-close-btn">
            <Icon name="x" />
          </button>
        </div>

        {shopStatus && (
          <div
            data-testid="cart-shop-status"
            className={`mb-4 rounded-2xl border p-4 text-sm font-bold ${
              isOpen
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {isOpen ? (
              <>We're open — your order will be prepared right away.</>
            ) : (
              <>
                <p className="font-black">We're currently closed.</p>
                {shopStatus.nextOpenAt && (
                  <p className="mt-1 font-medium">
                    Next opening: {new Date(shopStatus.nextOpenAt).toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {acceptsScheduled && <p className="mt-1 font-medium">You can still pre-order for a later time below.</p>}
              </>
            )}
          </div>
        )}

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            Your basket is empty.
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-white/50">{formatPrice(item.price)} each</p>
                    </div>
                    <button onClick={() => setCart((prev) => prev.filter((x) => x.id !== item.id))}>
                      <Icon name="trash" className="text-white/40 hover:text-red-400" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => changeQty(item.id, -1)} className="rounded-full bg-white/10 p-2">
                        <Icon name="minus" size={15} />
                      </button>
                      <span className="w-7 text-center font-bold">{item.qty}</span>
                      <button onClick={() => changeQty(item.id, 1)} className="rounded-full bg-white/10 p-2">
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                    <b>{formatPrice(item.price * item.qty)}</b>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-6 border-t border-white/10 pt-5 text-base font-bold">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">{formatPrice(subtotal)}</span>
              </div>
              {orderType === "Delivery" && (
                <div className="mt-2 flex justify-between text-white/70">
                  <span>Delivery {deliveryQuote?.area ? `(${deliveryQuote.area})` : ""}</span>
                  <span data-testid="cart-delivery-fee">
                    {quoteLoading ? "..." : deliveryQuote?.deliverable ? formatPrice(deliveryFee) : "—"}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-2xl font-black">
                <span>Total</span>
                <span className="text-[#ff5b00]" data-testid="cart-total">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {placed ? (
              <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-5 text-green-200">
                {checkoutMessage || "Order placed successfully."}
              </div>
            ) : (
              <form onSubmit={submitOrder} className="grid gap-3" data-testid="cart-form">
                {checkoutMessage && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                    {checkoutMessage}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {["Collection", "Delivery"].map((type) => (
                    <button
                      type="button"
                      key={type}
                      data-testid={`order-type-${type.toLowerCase()}`}
                      onClick={() => setOrderType(type)}
                      className={`rounded-full py-3 font-bold ${orderType === type ? "bg-[#ff5b00]" : "bg-white/10"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Schedule selector */}
                {(isOpen ? acceptsScheduled : true) && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-3 text-sm font-black text-white">When?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!isOpen}
                        data-testid="schedule-asap"
                        onClick={() => setScheduleMode("asap")}
                        className={`rounded-full py-2 text-sm font-bold ${
                          scheduleMode === "asap" && isOpen
                            ? "bg-[#ff5b00] text-white"
                            : "bg-white/10 text-white/60"
                        } ${!isOpen ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        As soon as possible
                      </button>
                      <button
                        type="button"
                        data-testid="schedule-later"
                        disabled={!acceptsScheduled}
                        onClick={() => setScheduleMode("schedule")}
                        className={`rounded-full py-2 text-sm font-bold ${
                          scheduleMode === "schedule"
                            ? "bg-[#ff5b00] text-white"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        Schedule for later
                      </button>
                    </div>
                    {scheduleMode === "schedule" && (
                      <input
                        type="datetime-local"
                        required
                        data-testid="schedule-input"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none focus:ring-2 focus:ring-[#ff5b00]"
                      />
                    )}
                  </div>
                )}

                <input
                  required
                  placeholder="Your name"
                  data-testid="customer-name-input"
                  value={customer.name || user?.name || ""}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
                />

                <input
                  required
                  placeholder="Phone number"
                  data-testid="customer-phone-input"
                  value={customer.phone || user?.phone || ""}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
                />

                {orderType === "Delivery" && (
                  <div className="grid gap-3">
                    {user && savedDeliveryAddresses.length > 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-3 text-sm font-black text-white">Choose saved address</p>
                        <div className="grid gap-3">
                          {savedDeliveryAddresses.map((address) => {
                            const fullAddress = formatAddress(address);
                            const isSelected = customer.selectedAddressId === address._id;
                            return (
                              <button
                                type="button"
                                key={address._id}
                                onClick={() => selectSavedAddress(address)}
                                className={`rounded-xl border p-4 text-left transition ${
                                  isSelected
                                    ? "border-[#ff5b00] bg-[#ff5b00]/15"
                                    : "border-white/10 bg-black/25 hover:border-[#ff5b00]/60"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-black text-[#ff5b00]">{address.label || "Saved Address"}</span>
                                  {isSelected && (
                                    <span className="rounded-full bg-[#ff5b00] px-3 py-1 text-xs font-black text-white">Selected</span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-white/70">{fullAddress}</p>
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-4 text-xs text-white/45">Or type a different address below.</p>
                      </div>
                    )}

                    <input
                      required
                      data-testid="delivery-address-input"
                      placeholder={savedDeliveryAddresses.length > 0 ? "Or enter a different delivery address (include town/postcode)" : "Delivery address (include town/postcode)"}
                      value={customer.address}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          address: e.target.value,
                          selectedAddressId: "",
                        })
                      }
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
                    />

                    {(customer.address || "").trim().length >= 4 && (
                      <div
                        data-testid="delivery-quote-result"
                        className={`rounded-2xl border p-3 text-sm font-bold ${
                          quoteLoading
                            ? "border-white/10 bg-white/5 text-white/60"
                            : deliveryQuote?.deliverable
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-red-500/30 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {quoteLoading
                          ? "Checking delivery area..."
                          : deliveryQuote?.deliverable
                          ? `Delivery to ${deliveryQuote.area}: £${Number(deliveryQuote.fee).toFixed(2)}`
                          : deliveryQuote?.message || "Address not in our delivery area."}
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  placeholder="Notes / allergies"
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  className="min-h-24 rounded-2xl border border-white/10 bg-white/5 p-4 outline-none focus:ring-2 focus:ring-[#ff5b00]"
                />

                {error && (
                  <p data-testid="cart-error" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  data-testid="place-order-btn"
                  disabled={submitting || (!isOpen && (!acceptsScheduled))}
                  className="rounded-full bg-[#ff5b00] py-4 text-lg font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  {submitting
                    ? "Processing..."
                    : !isOpen && !acceptsScheduled
                    ? "Closed - try again later"
                    : !isOpen
                    ? "Pre-Order for Later"
                    : "Place Order"}
                </Button>
              </form>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
