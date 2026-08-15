# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** <Gemini 3.6 Flash(High)>

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Tell me how to setup the foundation of the project, so that the frontend and backend start succesfully | I used it to set up the scaffold provided and make sure that it works with no issue. |
| 2 | I got the Prisma schema validation error, tell me how I can fix it. | I used the result to understand the error, and what was causing it.|
| 3 | I can't reach the database server at localhost:5432. What's giving me this error| I realised I forgot to stat the database in docker.|
| 4 | How do I make sure bootstrap is installed and is visible in the frontend | I didn't know what boostrap was, so this was useful for making understand where it goes and what it does.|
| 5 | Tell me how I can implement an API health check that satisfies the conditions for issue 2| I used it to see a step by step instuction, and plan on how to implement the API health check.|
| 6 | Please elaborate on what to do in the step 3 you provided| I'm not used to working with APIs so I needed some more clarification on the API instuctions given by the AI agent.|


## Reflection
Two or three sentences: what made your prompts better, and one place you had to
correct or reject what the agent produced.

    Most of my prompts worked, but the problem is that sometimes the information given wasn't enough for me to understand, so I had to prompt again for more details. There was one place I had to reject what the agent produced, because I forgot to add "Do not write any code" in the prompt. Other than that, my prompts has gotten abit better as I try to be more consise and detailed in my prompts.
