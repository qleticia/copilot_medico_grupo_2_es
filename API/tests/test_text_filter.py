import importlib
import types
import sys


def make_fake_spacy():
    # Build a minimal fake spacy module with load() returning a fake nlp callable
    spacy = types.ModuleType("spacy")

    class FakeToken:
        def __init__(self, text, label_):
            self.text = text
            self.label_ = label_

    class FakeDoc:
        def __init__(self, text, ents):
            self.text = text
            self.ents = ents

    def load(model_name):
        def nlp(text):
            # Pretend it detects two person names in the sample text
            ents = []
            if "Maria" in text:
                ents.append(FakeToken("Maria", "PER"))
            if "Joao" in text:
                ents.append(FakeToken("Joao", "PER"))
            return FakeDoc(text, ents)
        return nlp

    spacy.load = load
    return spacy


def test_remover_nomes_monkeypatched_spacy(monkeypatch):
    # Insert fake spacy before importing the module under test
    monkeypatch.setitem(sys.modules, "spacy", make_fake_spacy())
    mod = importlib.import_module("backend.text_filter")
    importlib.reload(mod)

    text = "Maria encontrou Joao no hospital."
    result = mod.remover_nomes(text)
    # Expect names to be removed, leaving remaining text trimmed
    assert "Maria" not in result
    assert "Joao" not in result
    assert "hospital" in result


def test_retornar_nome(monkeypatch):
    # Fake spacy again
    monkeypatch.setitem(sys.modules, "spacy", make_fake_spacy())
    mod = importlib.import_module("backend.text_filter")
    importlib.reload(mod)

    name = mod.retornar_nome("Converse com Maria e Joao")
    # Implementation returns the last seen name (if multiple)
    assert name in {"Maria", "Joao"}
