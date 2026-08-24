"""
Configuration for TikTok Shop Product Checker.
Set your API key and provider here.
"""

# ============================================================
# API PROVIDER — pick one, set its key
# ============================================================

# Option 1: SocialCrawl (RECOMMENDED - 100 free credits, no card)
# Sign up: https://www.socialcrawl.dev
API_PROVIDER = "socialcrawl"
API_KEY = ""  # paste your key here

# Option 2: SociaVault (50 free credits, no card)
# Sign up: https://sociavault.com
# API_PROVIDER = "sociavault"
# API_KEY = ""

# Option 3: GetAnyAPI (deepest data - 30d + lifetime sales, GMV)
# Sign up: https://getanyapi.com
# API_PROVIDER = "getanyapi"
# API_KEY = ""

# ============================================================
# INPUT / OUTPUT
# ============================================================

INPUT_FILE = "products.csv"  # or .xlsx — your product list
OUTPUT_FILE = "tiktok_shop_results.xlsx"

# ============================================================
# PROCESSING
# ============================================================

REGION = "US"
MAX_RESULTS_PER_SEARCH = 10
MATCH_CONFIDENCE_THRESHOLD = 30  # skip matches below this score
BATCH_SIZE = 10  # save progress every N products
REQUEST_DELAY = 1.0  # seconds between API calls (respect rate limits)
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds before retry on failure

# Your cost per unit (used for profit calculations)
# If your input file has a 'cost' column, that takes priority
DEFAULT_COST = 0.0

# TikTok Shop fee rate (for profit estimation)
TIKTOK_FEE_RATE = 0.08
