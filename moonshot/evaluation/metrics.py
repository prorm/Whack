import re


def word_error(reference, hypothesis):
    a, b = (re.findall(r"[\w-]+", text.casefold()) for text in (reference, hypothesis))
    prior = list(range(len(b) + 1))
    for row, word in enumerate(a, 1):
        current = [row]
        for col, other in enumerate(b, 1):
            current.append(min(prior[col] + 1, current[-1] + 1, prior[col-1] + (word != other)))
        prior = current
    return round(prior[-1] / max(1, len(a)), 4)
