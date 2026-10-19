import type { StaticContent } from "@/components/shop/static-page";

export const pages: Record<string, StaticContent> = {
  sell: {
    slug: "sell", title: "Sell on Everyday", subtitle: "Reach millions of customers. Grow your business with Everyday Selling.",
    crumbs: [{ label: "Make Money with Us" }, { label: "Sell products" }],
    blocks: [
      { type: "lead", text: "Whether you sell a few items a month or millions, Everyday gives you the tools, reach and trust to grow. List your products, ship them yourself or let us handle fulfilment, and get paid on time." },
      { type: "h2", text: "Choose a selling plan" },
      { type: "cards", items: [
        { title: "Individual", body: "$0.99 per item sold. Great for casual sellers listing fewer than 40 products a month. No monthly fee." },
        { title: "Professional", body: "$39.99 per month. For established sellers who want bulk listings, advanced reporting, advertising and the Buy Box." },
      ] },
      { type: "h2", text: "How to start selling" },
      { type: "steps", items: [
        { title: "Create your seller account", body: "Sign up with your email, business details and a chargeable card for the selling fees." },
        { title: "List your products", body: "Add products one by one or in bulk. Set your price, quantity and shipping options." },
        { title: "Decide how to fulfil", body: "Ship orders yourself, or send stock to an Everyday fulfilment centre and we pick, pack and deliver it." },
        { title: "Get paid", body: "We deposit your proceeds every 14 days, minus fees, straight to your bank account." },
      ] },
      { type: "h2", text: "Why sellers choose Everyday" },
      { type: "bullets", items: [
        "Access to a large base of active, loyal customers.",
        "Fulfilment by Everyday: fast delivery badges that lift conversion.",
        "Built-in advertising to put products in front of shoppers.",
        "Seller app to manage your business from anywhere.",
        "Transparent fees — you always know what you'll pay.",
      ] },
      { type: "cta", label: "Start selling", href: "/account", note: "You'll be guided through account setup step by step." },
      { type: "h2", text: "Frequently asked questions" },
      { type: "faq", items: [
        { q: "Do I need a registered business to sell?", a: "No. You can start as an individual. As you grow, you can add business details to unlock more features." },
        { q: "What fees will I pay?", a: "A referral fee (a percentage of the sale price, varying by category) plus your selling plan fee. Shipping and fulfilment costs apply only if you use them." },
        { q: "How and when am I paid?", a: "Proceeds are deposited to your bank account every 14 days after deducting any applicable fees." },
      ] },
    ],
    related: [{ label: "Become an affiliate", href: "/affiliates" }, { label: "Advertise your products", href: "/advertise" }, { label: "Self-publish a book", href: "/publishing" }, { label: "Help", href: "/help" }],
  },

  affiliates: {
    slug: "affiliates", title: "Everyday Associates", subtitle: "Earn advertising fees by recommending products you love.",
    crumbs: [{ label: "Make Money with Us" }, { label: "Become an Affiliate" }],
    blocks: [
      { type: "lead", text: "The Everyday Associates programme lets creators, publishers and site owners earn by linking to products. When someone buys through your link, you get a share of the sale." },
      { type: "h2", text: "How it works" },
      { type: "steps", items: [
        { title: "Sign up", body: "Create your account and tell us about your website, app or social channels." },
        { title: "Get your links", body: "Use the site tools to create product links, banners and a search box for your audience." },
        { title: "Earn fees", body: "Collect advertising fees on qualifying purchases made within 24 hours of a click." },
      ] },
      { type: "table", caption: "Sample advertising fee rates", head: ["Category", "Rate"], rows: [
        ["Physical books, kitchen, home", "4.5%"],
        ["Toys, furniture, beauty", "3%"],
        ["Electronics, gaming", "2%"],
        ["Video games, TVs", "1%"],
      ] },
      { type: "cta", label: "Join now", href: "/account", note: "Free to join. Most approvals take under an hour." },
      { type: "faq", items: [
        { q: "When do I get paid?", a: "Fees are paid roughly 60 days after the end of the month in which the sale occurred, once a minimum balance is reached." },
        { q: "Can I promote on social media?", a: "Yes, as long as you clearly disclose your affiliate relationship and follow the programme policies." },
      ] },
    ],
    related: [{ label: "Sell products", href: "/sell" }, { label: "Advertise your products", href: "/advertise" }, { label: "Help", href: "/help" }],
  },

  advertise: {
    slug: "advertise", title: "Everyday Ads", subtitle: "Help shoppers discover your products where they shop.",
    crumbs: [{ label: "Make Money with Us" }, { label: "Advertise Your Products" }],
    blocks: [
      { type: "lead", text: "Reach customers at every stage of their journey with ad formats that appear in Everyday results and on popular content across the web." },
      { type: "h2", text: "Ad products" },
      { type: "cards", items: [
        { title: "Sponsored Products", body: "Promote individual listings in shopping results and on product pages. Pay per click." },
        { title: "Sponsored Brands", body: "Feature your brand, custom headline and up to three products at the top of results." },
        { title: "Sponsored Display", body: "Reach relevant audiences on and off Everyday with automatic audience targeting." },
      ] },
      { type: "h2", text: "Why advertise with us" },
      { type: "bullets", items: [
        "Ads shown to shoppers with strong purchase intent.",
        "Self-service tools with flexible budgets — start from as little as $1 a day.",
        "Measurable results with sales and new-to-brand reporting.",
      ] },
      { type: "cta", label: "Create a campaign", href: "/account", note: "You need a Professional selling account or vendor central access." },
    ],
    related: [{ label: "Sell products", href: "/sell" }, { label: "Become an affiliate", href: "/affiliates" }, { label: "Help", href: "/help" }],
  },

  publishing: {
    slug: "publishing", title: "Self-Publish with Everyday", subtitle: "Publish your book for free and reach readers worldwide.",
    crumbs: [{ label: "Make Money with Us" }, { label: "Self-Publish with Us" }],
    blocks: [
      { type: "lead", text: "Self-publish ebooks and paperbacks in minutes. Keep control of your rights and earn up to 70% royalty, with your book available to readers around the world." },
      { type: "h2", text: "What you get" },
      { type: "bullets", items: [
        "Free publishing tools for ebook and print.",
        "Up to 70% royalty on eligible ebook prices.",
        "Global distribution to millions of readers.",
        "Marketing and advertising options to grow your audience.",
        "Lend and subscription programmes to earn more.",
      ] },
      { type: "steps", items: [
        { title: "Create your title", body: "Add your cover, description and manuscript using our guided setup." },
        { title: "Set your price", body: "Choose a royalty plan and pricing that fits your book." },
        { title: "Publish", body: "Your book goes live in up to 72 hours and you earn on every sale." },
      ] },
      { type: "cta", label: "Start publishing", href: "/account" },
    ],
    related: [{ label: "Sell products", href: "/sell" }, { label: "Advertise your products", href: "/advertise" }, { label: "Help", href: "/help" }],
  },

  "business-card": {
    slug: "business-card", title: "Everyday Business Card", subtitle: "A rewards card built for the way you shop and work.",
    crumbs: [{ label: "Payment Products" }, { label: "Everyday Business Card" }],
    blocks: [
      { type: "lead", text: "Earn rewards on everyday business expenses with no annual fee and no preset spending limit. Track everything on a separate account so your books stay clean." },
      { type: "cards", items: [
        { title: "Earn on every purchase", body: "5% on Everyday Ads, 3% on gas and travel, 2% on restaurants, 1% on everything else." },
        { title: "No annual fee", body: "Keep more of what you earn. No membership cost to carry the card." },
        { title: "Separate your finances", body: "A dedicated business card with simple expense tracking and virtual card numbers." },
      ] },
      { type: "h2", text: "Eligibility" },
      { type: "p", text: "Available to registered businesses. Approval is subject to credit review. This is a demonstration page and no real credit application is processed." },
      { type: "cta", label: "Learn more", href: "/account" },
    ],
    related: [{ label: "Shop with Points", href: "/points" }, { label: "Reload your balance", href: "/reload-balance" }, { label: "Currency Card", href: "/currency-card" }],
  },

  points: {
    slug: "points", title: "Shop with Points", subtitle: "Use the reward points you already have at checkout.",
    crumbs: [{ label: "Payment Products" }, { label: "Shop with Points" }],
    blocks: [
      { type: "lead", text: "Link an eligible rewards card and spend your points on millions of products. At checkout, choose how many points to apply and pay the rest with your card." },
      { type: "h2", text: "How to use it" },
      { type: "steps", items: [
        { title: "Link your card", body: "Add an eligible rewards card to your Everyday account." },
        { title: "Shop as usual", body: "Points can be applied to almost everything in the store." },
        { title: "Redeem at checkout", body: "On the payment page, select your points balance and confirm." },
      ] },
      { type: "cta", label: "Manage payment methods", href: "/account" },
    ],
    related: [{ label: "Business Card", href: "/business-card" }, { label: "Reload your balance", href: "/reload-balance" }, { label: "Help", href: "/help" }],
  },

  "reload-balance": {
    slug: "reload-balance", title: "Reload Your Balance", subtitle: "Turn your gift-card balance into rewards, or top it up.",
    crumbs: [{ label: "Payment Products" }, { label: "Reload Your Balance" }],
    blocks: [
      { type: "lead", text: "Keep your Everyday gift-card balance topped up for fast, secure checkout, or convert an eligible balance into reward points." },
      { type: "cards", items: [
        { title: "Auto-reload", body: "Set a threshold and we'll add funds automatically so you never run short." },
        { title: "Convert to points", body: "Move an eligible gift-card balance into your rewards in a couple of taps." },
      ] },
      { type: "cta", label: "Manage your balance", href: "/account" },
    ],
    related: [{ label: "Business Card", href: "/business-card" }, { label: "Shop with Points", href: "/points" }, { label: "Gift cards", href: "/gift-cards" }],
  },

  "currency-card": {
    slug: "currency-card", title: "Everyday Currency Card", subtitle: "A travel-friendly card with no foreign transaction fees.",
    crumbs: [{ label: "Payment Products" }, { label: "Everyday Currency Card" }],
    blocks: [
      { type: "lead", text: "Pay abroad the way locals do. Hold multiple currencies, get competitive exchange rates, and avoid the fees that add up on international trips." },
      { type: "bullets", items: [
        "No foreign transaction fees.",
        "Competitive mid-market exchange rates.",
        "Freeze and unfreeze the card from the app.",
        "Withdraw cash abroad at millions of ATMs.",
      ] },
      { type: "p", text: "This is a demonstration page. No real card is issued and no funds move." },
      { type: "cta", label: "Learn more", href: "/account" },
    ],
    related: [{ label: "Business Card", href: "/business-card" }, { label: "Shop with Points", href: "/points" }, { label: "Help", href: "/help" }],
  },

  careers: {
    slug: "careers", title: "Careers at Everyday", subtitle: "Build the future of shopping with us.",
    crumbs: [{ label: "Get to Know Us" }, { label: "Careers" }],
    blocks: [
      { type: "lead", text: "We're a team of builders, scientists, operators and dreamers focused on making customers' lives better and easier. If you like solving hard problems at scale, you'll fit right in." },
      { type: "h2", text: "Life at Everyday" },
      { type: "cards", items: [
        { title: "Invent for customers", body: "Everything starts with the customer and works backwards." },
        { title: "Own your impact", body: "Small, empowered teams with real ownership and room to grow." },
        { title: "Think long term", body: "We invest in durable outcomes, not quarterly noise." },
      ] },
      { type: "h2", text: "Open roles" },
      { type: "table", head: ["Team", "Location", "Type"], rows: [
        ["Software Engineering", "Remote / Austin", "Full time"],
        ["Fulfilment Operations", "Multiple sites", "Full time"],
        ["Product Design", "Remote", "Full time"],
        ["Data Science", "Remote", "Full time"],
      ] },
      { type: "cta", label: "See all openings", href: "/account", note: "Sign in to view and apply for open roles." },
    ],
    related: [{ label: "About Everyday", href: "/about" }, { label: "Investor relations", href: "/investors" }, { label: "Devices", href: "/devices" }],
  },

  investors: {
    slug: "investors", title: "Investor Relations", subtitle: "Financial information and governance for Everyday.",
    crumbs: [{ label: "Get to Know Us" }, { label: "Investor Relations" }],
    blocks: [
      { type: "lead", text: "This section is a demonstration of an investor-relations landing page. It does not represent a real company or provide real financial data." },
      { type: "h2", text: "Quick links" },
      { type: "cards", items: [
        { title: "Quarterly results", body: "Revenue, free cash flow and segment performance for recent quarters." },
        { title: "Annual reports", body: "The full-year letter to shareholders and audited financials." },
        { title: "Governance", body: "Board composition, committee charters and policies." },
      ] },
      { type: "h2", text: "Upcoming events" },
      { type: "table", head: ["Event", "Date"], rows: [
        ["Q3 earnings call", "Demo date"],
        ["Annual shareholder meeting", "Demo date"],
      ] },
    ],
    related: [{ label: "About Everyday", href: "/about" }, { label: "Careers", href: "/careers" }, { label: "Help", href: "/help" }],
  },

  devices: {
    slug: "devices", title: "Everyday Devices", subtitle: "Echo, Tab and more — devices that make everyday easier.",
    crumbs: [{ label: "Get to Know Us" }, { label: "Everyday Devices" }],
    blocks: [
      { type: "lead", text: "From smart speakers to tablets, Everyday devices bring the store, your media and your home closer together." },
      { type: "cards", items: [
        { title: "Echo", body: "Voice, sound and smart-home control in one compact speaker." },
        { title: "Tab", body: "A family-friendly tablet with hands-on learning and entertainment." },
        { title: "Home", body: "See who's at the door and keep an eye on what matters." },
      ] },
      { type: "cta", label: "Shop devices", href: "/shop?category=tech", auth: false },
    ],
    related: [{ label: "Tech & electronics", href: "/shop?category=tech" }, { label: "About Everyday", href: "/about" }, { label: "Help", href: "/help" }],
  },

  shipping: {
    slug: "shipping", title: "Shipping Rates & Policies", subtitle: "Clear delivery options and prices before you check out.",
    crumbs: [{ label: "Let Us Help You" }, { label: "Shipping Rates & Policies" }],
    blocks: [
      { type: "lead", text: "Delivery estimates and shipping costs are shown on every product page and again at checkout, so the total you see is the total you pay." },
      { type: "table", caption: "Standard delivery options", head: ["Option", "Cost", "Speed"], rows: [
        ["Standard (orders over $50)", "Free", "3–5 business days"],
        ["Standard (orders under $50)", "$4.95", "3–5 business days"],
        ["Two-day", "From $9.99", "2 business days"],
        ["Same-day select areas", "From $14.99", "Today"],
      ] },
      { type: "h2", text: "What affects delivery" },
      { type: "bullets", items: [
        "Your location relative to the nearest fulfilment centre.",
        "Whether an item ships from Everyday or a third-party seller.",
        "Order cut-off times and weekends or holidays.",
      ] },
      { type: "p", text: "This is a demonstration store. No physical items are shipped." },
    ],
    related: [{ label: "Returns & replacements", href: "/returns" }, { label: "Your orders", href: "/orders" }, { label: "Help", href: "/help" }],
  },

  returns: {
    slug: "returns", title: "Returns & Replacements", subtitle: "Changed your mind? Most items can be returned within 30 days.",
    crumbs: [{ label: "Let Us Help You" }, { label: "Returns & Replacements" }],
    blocks: [
      { type: "lead", text: "Returns are simple and free for most items. Start a return from your order history and follow the on-screen instructions." },
      { type: "h2", text: "How to return an item" },
      { type: "steps", items: [
        { title: "Open your orders", body: "Go to Your Orders and find the item you want to return." },
        { title: "Choose Return", body: "Select a reason and a refund method." },
        { title: "Send it back", body: "Use the prepaid label, or drop at a nearby location." },
        { title: "Get refunded", body: "Refunds are issued to your original payment method within a few days of receipt." },
      ] },
      { type: "h2", text: "Policy notes" },
      { type: "bullets", items: [
        "Most items: free return within 30 days of delivery.",
        "Gifts: return for a gift card or exchange.",
        "Some categories (e.g. personalised, hazardous) have different rules.",
      ] },
      { type: "cta", label: "Start a return", href: "/orders" },
    ],
    related: [{ label: "Shipping rates & policies", href: "/shipping" }, { label: "Your orders", href: "/orders" }, { label: "Help", href: "/help" }],
  },

  registry: {
    slug: "registry", title: "Everyday Registry", subtitle: "Create one list for every occasion and share it with loved ones.",
    crumbs: [{ label: "Registry" }],
    blocks: [
      { type: "lead", text: "Build a registry for a wedding, baby shower, birthday or graduation. Add items from across the store, get completion discounts, and let gift-givers buy with one tap." },
      { type: "steps", items: [
        { title: "Create your registry", body: "Name it, pick an occasion and a date." },
        { title: "Add anything", body: "Save products from any category to your list." },
        { title: "Share the link", body: "Send your registry to friends and family." },
      ] },
      { type: "cta", label: "Create a registry", href: "/saved" },
    ],
    related: [{ label: "Gift cards", href: "/gift-cards" }, { label: "Your account", href: "/account" }, { label: "Help", href: "/help" }],
  },

  "gift-cards": {
    slug: "gift-cards", title: "Gift Cards", subtitle: "The perfect gift for any occasion — they never run out of options.",
    crumbs: [{ label: "Gift Cards" }],
    blocks: [
      { type: "lead", text: "Everyday gift cards come in dozens of designs, from e-cards delivered instantly to physical cards for special occasions. No fees, no expiry." },
      { type: "cards", items: [
        { title: "eGift cards", body: "Delivered by email or text, ready in minutes." },
        { title: "Print at home", body: "Choose a design and print it yourself." },
        { title: "Physical cards", body: "A real card in an envelope, mailed to the recipient." },
      ] },
      { type: "cta", label: "Shop gift cards", href: "/shop", auth: false },
    ],
    related: [{ label: "Reload your balance", href: "/reload-balance" }, { label: "Registry", href: "/registry" }, { label: "Help", href: "/help" }],
  },

  conditions: {
    slug: "conditions", title: "Conditions of Use", subtitle: "The terms that apply when you use Everyday.",
    crumbs: [{ label: "Conditions of Use" }],
    blocks: [
      { type: "lead", text: "This is a demonstration page summarising the kind of terms a real storefront publishes. It is not a legally binding agreement." },
      { type: "h2", text: "Using the store" },
      { type: "bullets", items: [
        "You're responsible for keeping your account credentials secure.",
        "Listed prices and availability are for demonstration only.",
        "Orders placed here are simulated and are never fulfilled or charged.",
        "Content is provided as-is for educational purposes.",
      ] },
      { type: "h2", text: "Acceptable use" },
      { type: "p", text: "Don't misuse the service, attempt to disrupt it, or use it for anything unlawful. We may suspend accounts that abuse the platform." },
    ],
    related: [{ label: "Privacy notice", href: "/privacy" }, { label: "Help", href: "/help" }, { label: "About Everyday", href: "/about" }],
  },

  privacy: {
    slug: "privacy", title: "Privacy Notice", subtitle: "How Everyday handles your information.",
    crumbs: [{ label: "Privacy Notice" }],
    blocks: [
      { type: "lead", text: "This is a demonstration privacy notice describing the kinds of practices a real storefront follows. No real personal data is collected or sold." },
      { type: "h2", text: "What we collect" },
      { type: "bullets", items: [
        "Account information you provide (email, addresses).",
        "Order and cart activity.",
        "Device and usage data to keep the store secure.",
      ] },
      { type: "h2", text: "How we use it" },
      { type: "p", text: "To process orders, personalise recommendations, prevent fraud and improve the experience. Guest carts and favourites are stored in your own browser." },
      { type: "h2", text: "Your choices" },
      { type: "p", text: "You can view and update your account, clear saved data, and request deletion of your account at any time." },
    ],
    related: [{ label: "Conditions of use", href: "/conditions" }, { label: "Your account", href: "/account" }, { label: "Help", href: "/help" }],
  },
};
