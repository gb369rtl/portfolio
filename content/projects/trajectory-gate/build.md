## Build order

| Stage | What I build                      | It is done when                                       |
| ----- | --------------------------------- | ----------------------------------------------------- |
| 1     | The recorder and the file format  | A run of a sample agent becomes a readable recording  |
| 2     | The replayer                      | The same agent runs offline from that recording       |
| 3     | The comparer, with the four modes | A reordered run fails strict and passes unordered     |
| 4     | The rules file and argument rules | One field can be exact while another is ignored       |
| 5     | Repeats and thresholds            | A case can require five matches out of five           |
| 6     | The GitHub Action and the comment | A pull request gets a check and a readable difference |
| 7     | The seeded-regression study       | The two numbers below are published                   |

## How it is measured

I take a working sample agent with 30 approved cases, then change it on purpose.

**Twenty harmful changes.** Delete an instruction. Rename a tool. Blur a tool's description. Swap the order of two steps in the prompt. Move to a weaker model. Each is a change that should be caught.

**Twenty harmless changes.** Reword a sentence. Fix a typo. Reformat the prompt. None should fail the check.

| Number              | How it is counted                                   |
| ------------------- | --------------------------------------------------- |
| Catch rate          | Of the 20 harmful changes, how many fail the check  |
| False alarm rate    | Of the 20 harmless changes, how many fail the check |
| Minutes added to CI | For the 30 cases at five repeats                    |

## After the first version

- Building recordings straight from traces, so production runs can become cases
- A report of which cases are flaky and should have looser rules

## Reading behind this design

- [Trajectory evals](https://docs.langchain.com/langsmith/trajectory-evals): the four match modes this borrows
