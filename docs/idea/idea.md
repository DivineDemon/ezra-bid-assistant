Hi, I want to build a private Chrome Extension called Ezra Bid Assistant for Freelancer.com.

The goal is to create a safe AI bidding assistant that helps me write proposals faster while I am browsing Freelancer.com. It must not auto-submit bids, collect passwords, collect cookies, bypass Freelancer security, or mass-bid. It should only generate a proposal draft that I can review and submit manually.

Core workflow:

 1.⁠ ⁠I open a project page on Freelancer.com.
 2.⁠ ⁠The Chrome Extension detects that I am on a project page.
 3.⁠ ⁠It extracts the visible project information from the page, including:

   * Project title
   * Project description
   * Budget
   * Skills/tags
   * Client country, if visible
   * Project type, if visible
 4.⁠ ⁠A small button appears on the Freelancer page saying “Generate Bid with Ezra”.
 5.⁠ ⁠When I click the button, the Ezra Bid Assistant side panel opens.
 6.⁠ ⁠The extracted project details appear inside the side panel.
 7.⁠ ⁠I can review or edit the details before generating the proposal.
 8.⁠ ⁠I click “Generate Proposal”.
 9.⁠ ⁠The extension sends the project details to my private backend endpoint.
10.⁠ ⁠The backend connects to the OpenAI API and returns a proposal.
11.⁠ ⁠The proposal appears inside the side panel.
12.⁠ ⁠I can copy the proposal or insert it into the Freelancer bid text box.
13.⁠ ⁠I manually review and manually submit the bid myself.

The extension must use Chrome Manifest V3 and include:

•⁠  ⁠manifest.json
•⁠  ⁠background/service worker
•⁠  ⁠content script for Freelancer.com project pages
•⁠  ⁠side panel UI
•⁠  ⁠settings/options page if needed

Permissions must be kept minimal. Host permissions should be limited to Freelancer.com only. The extension should use content scripts only on Freelancer project pages, the Chrome sidePanel permission, storage permission for saved settings, and activeTab only if needed.

The content script should detect Freelancer project pages, read only visible project details from the DOM, add the “Generate Bid with Ezra” button, and send the extracted project data to the side panel using Chrome runtime messaging. It must never send cookies, passwords, session tokens, hidden account data, or automatically submit forms.

The side panel should use my existing Figma design as the base and adapt it into a Chrome Extension side panel layout.

The side panel should include:

•⁠  ⁠App name: Ezra Bid Assistant
•⁠  ⁠Status: “Project detected” or “No project detected”
•⁠  ⁠Extracted project title
•⁠  ⁠Extracted project description
•⁠  ⁠Budget
•⁠  ⁠Skills
•⁠  ⁠Extra instructions box
•⁠  ⁠Proposal style dropdown with:

  * Professional
  * Premium Agency
  * Short & Direct
  * Confident
  * Friendly
•⁠  ⁠Proposal length dropdown with:

  * Short
  * Medium
  * Detailed
•⁠  ⁠Generate Proposal button
•⁠  ⁠Loading state
•⁠  ⁠Generated proposal output box
•⁠  ⁠Copy Proposal button
•⁠  ⁠Insert Into Bid Box button
•⁠  ⁠Regenerate button
•⁠  ⁠Save Draft button
•⁠  ⁠Clear button

The “Insert Into Bid Box” feature must only place the generated proposal into the visible Freelancer proposal/bid text area. It must not click the final submit, place bid, or send button. After inserting, show this message:

“Proposal inserted. Please review and submit manually.”

The extension frontend must call my private backend endpoint:

POST /api/generate-bid

Request body:

{
"projectTitle": "",
"projectDescription": "",
"budget": "",
"skills": "",
"clientCountry": "",
"projectType": "",
"extraInstructions": "",
"proposalStyle": "",
"proposalLength": "",
"customPromptRules": ""
}

Expected response:

{
"proposal": "Generated proposal text here"
}

The Chrome Extension must not call OpenAI directly. The OpenAI API key must only be stored on the backend as an environment variable:

OPENAI_API_KEY

Please create a sample Next.js backend API route:

/api/generate-bid

The backend should receive the project details from the extension, build a clean prompt, call the OpenAI Responses API server-side, return only the generated proposal text, handle errors properly, and never expose the OpenAI API key to the extension.

Default proposal rules:

Write a professional Freelancer.com proposal based on the project details. Use exactly 4 short paragraphs. No headings, bullets, or lists. The tone must be professional, calm, confident, natural, and human.

Start by showing that I understand the client’s project. Mention relevant experience without overclaiming. Explain the approach clearly and practically. Mention Ezra Global where natural.

Avoid generic AI wording, fake portfolio claims, exaggerated sales language, and anything that sounds desperate.

End by inviting the client to chat and include this sentence:

“Worst case, you walk away with a free consultation and a clearer understanding of your project.”

End exactly with:

“Kind regards, Desmond”

Saved drafts should be stored locally using Chrome storage or local storage. Each saved draft should include:

•⁠  ⁠Project title
•⁠  ⁠Date
•⁠  ⁠Proposal style
•⁠  ⁠Generated proposal
•⁠  ⁠Original project details

The settings area should allow me to edit:

•⁠  ⁠Backend API URL
•⁠  ⁠Default proposal rules
•⁠  ⁠Default sign-off
•⁠  ⁠Company name
•⁠  ⁠Services offered
•⁠  ⁠Words to avoid
•⁠  ⁠Default proposal style
•⁠  ⁠Default proposal length

Design direction:

Keep the design premium, clean, fast, and simple. Use a dark navy and white interface with a subtle gold or electric blue accent. The side panel should be compact but comfortable to use, with clear spacing, modern cards, rounded inputs, readable typography, and success/error toasts. The generated proposal area must be large and easy to copy from.

Developer deliverables:

•⁠  ⁠React/TypeScript components
•⁠  ⁠Chrome Extension file structure
•⁠  ⁠manifest.json
•⁠  ⁠content script
•⁠  ⁠background/service worker
•⁠  ⁠side panel UI
•⁠  ⁠local storage or Chrome storage handling
•⁠  ⁠sample Next.js /api/generate-bid backend route
•⁠  ⁠setup instructions for installing dependencies
•⁠  ⁠instructions for adding OPENAI_API_KEY to .env
•⁠  ⁠instructions for running the backend locally
•⁠  ⁠instructions for loading the extension in Chrome developer mode
•⁠  ⁠instructions for testing it on Freelancer.com

Final product:

A private Chrome Extension AI bid assistant that works while I browse Freelancer.com. It should extract visible project details, generate a proposal using my prompt and backend API, allow me to copy or insert the proposal into the bid box, and always require me to manually review and submit the bid.