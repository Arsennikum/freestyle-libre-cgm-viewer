
# Instruction for data.csv
Log in to your LibreView account at https://www.libreview.com/ using your credentials.

Navigate to the Glucose History section from the top left of the page.

Click the "Download Glucose Data" button at the top right of the Glucose History page.

Complete the reCAPTCHA confirmation to prove you are not a robot.

Click the Download button in the pop-up window to start downloading your glucose data as a .csv file.

The .csv file will be saved on your device for further analysis or sharing.


# Instructions for notes 
First, I write down my daily notes and activities in a messenger app (for example, Telegram) in a free-form way.

Then I use the following prompt to convert those messages into a structured CSV file:

Prompt:
<spoiler>
Convert the following messenger messages into **CSV** with the format:
`DD-MM-YYYY HH:MM;note;details`
Use `;` as a delimiter.
Column headers must be:

```
timestamp;note;details
```

**Rules:**

1. If the short summary (`note`) is the same as the full text, leave the `details` field empty.
2. If the message contains a time inside the text, use that time instead of the message timestamp.
3. If the message contains multiple activities, split them into multiple rows. If relative times are given, calculate them.
4. Assume the message is written **at the end of the activity**, unless the wording clearly shows otherwise.
5. Summarize each activity in 2–3 words for the `note` field, keep the full description in `details`.
6. Output only valid CSV, no explanations.

**Example input:**

```
Alexey S, [6/29/25 9:38 AM]
Workout 15 min (lifting medium-power), calm 10 min, sitting down to eat

Alexey S, [6/29/25 9:38 AM]
Breakfast: Long-cooked oatmeal, hummus, avocado
```

**Example output:**

```
timestamp;note;details
29-06-2025 09:13;Workout;Lifting medium-power
29-06-2025 09:28;Rest;Calm 10 min
29-06-2025 09:38;Breakfast;Long-cooked oatmeal, hummus, avocado
```
</spoiler>

