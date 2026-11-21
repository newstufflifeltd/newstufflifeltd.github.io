import json
import urllib.parse
import feedparser
from bs4 import BeautifulSoup
import datetime

with open("terms.json", "r", encoding="utf-8") as f:
    terms = json.load(f)

chunk_size = 5
term_chunks = [terms[i:i + chunk_size] for i in range(0, len(terms), chunk_size)]
seller = "newstufflife"
unique_items = {}

print("Fetching and cleaning eBay RSS feeds...")

for chunk in term_chunks:
    keyword_str = f"({','.join(chunk)})"
    encoded_keyword = urllib.parse.quote(keyword_str, safe="")
    url = f"https://rssbay.net/feed?keyword={encoded_keyword}&globalId=EBAY-GB&location=GB&auction=1&buyitnow=1&condition=3000&seller={seller}&time-frame-type=-&time-frame-value=-"

    try:
        feed = feedparser.parse(url)
        for entry in feed.entries:
            raw_link = entry.get("link")
            if raw_link:
                # Normalize link by stripping tracking query params
                clean_link = raw_link.split('?')[0]

                if clean_link not in unique_items:
                    summary_html = entry.get("summary", "")

                    # Parse HTML cleanly with BeautifulSoup
                    soup = BeautifulSoup(summary_html, "html.parser")

                    # 1. Extract and optimize image URL
                    img_tag = soup.find("img")
                    image_url = ""
                    if img_tag and img_tag.has_attr("src"):
                        image_url = img_tag["src"]
                        # Swap thumbnail size for higher resolution
                        image_url = image_url.replace("s-l140", "s-l500").replace("s-l225", "s-l500").replace("s-l1600",
                                                                                                              "s-l500")

                    # 2. Extract clean text summary (stripped of HTML tags)
                    clean_summary = soup.get_text(separator=" ", strip=True)

                    # 3. Extract price text if present
                    price_text = ""
                    for text in soup.stripped_strings:
                        if any(curr in text for curr in ["GBP", "USD", "EUR", "£", "$", "€"]):
                            price_text = text
                            break

                    unique_items[clean_link] = {
                        "title": entry.get("title", "Untitled Item"),
                        "link": clean_link,
                        "published": entry.get("published", "recently"),
                        "image": image_url,
                        "price": price_text,
                        "summary": clean_summary[:150]
                    }
    except Exception as e:
        print(f"Error fetching chunk {chunk}: {e}")

output_data = {
    "updated_at": datetime.datetime.utcnow().strftime("%d %b %Y, %H:%M UTC"),
    "count": len(unique_items),
    "items": list(unique_items.values())
}

# Save output to items.json
with open("items.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"\nSuccessfully compiled and saved {len(unique_items)} clean items to items.json!")