"""Hand-checked people, characters, animals and objects.

Facts here are ones that can be checked in published books, sports records or
the writers' own book listings. Curated rows override a Wikidata row with the
same QID. Nothing in this file is an adult-entertainment entry; those come
only from Wikidata, by name, with no picture.
"""

from __future__ import annotations

COUNTRIES = [
    "from_bd", "from_in", "from_pk", "from_us", "from_gb", "from_jp", "from_kr",
    "from_cn", "from_fr", "from_de", "from_ru", "from_br", "from_ca", "from_au",
    "from_es", "from_it", "from_mx", "from_ng", "from_eg", "from_tr", "from_id",
    "from_sa", "from_ar", "from_za",
]
DECADES = [
    "born_pre1900", "born_1900_1949", "born_1950_1969", "born_1970_1979",
    "born_1980_1989", "born_1990_1999", "born_2000_plus",
]
JOBS = [
    "actor", "singer", "politician", "writer", "cricketer", "footballer", "athlete",
    "scientist", "musician", "director", "business", "youtube", "all_rounder",
]


def _close(yes, group, chosen):
    yes = set(yes)
    no = set(group) - yes
    if chosen:
        yes.add(chosen)
        no.discard(chosen)
    return yes, no


def person(qid, en, bn, pop, *, year, country, gender, jobs, alive, extra_yes=(), extra_no=(), aliases=()):
    yes, no = set(extra_yes), set(extra_no)
    yes.update(("real", "named", gender))
    no.update(("fictional", "animal", "object", "adult_ent"))
    no.add("female" if gender == "male" else "male")
    no.update(item for item in ("male", "female") if item != gender)
    bucket = None
    if year < 1900:
        bucket = "born_pre1900"
    elif year <= 1949:
        bucket = "born_1900_1949"
    elif year <= 1969:
        bucket = "born_1950_1969"
    elif year <= 1979:
        bucket = "born_1970_1979"
    elif year <= 1989:
        bucket = "born_1980_1989"
    elif year <= 1999:
        bucket = "born_1990_1999"
    else:
        bucket = "born_2000_plus"
    decade_yes, decade_no = _close((), DECADES, bucket)
    yes |= decade_yes
    no |= decade_no
    country_yes, country_no = _close((), COUNTRIES, country)
    yes |= country_yes
    no |= country_no
    for job in jobs:
        yes.add(job)
    if "cricketer" in jobs or "footballer" in jobs:
        yes.add("athlete")
    if "singer" in jobs:
        yes.add("musician")
    if alive is True:
        yes.add("alive"); no.add("dead")
    elif alive is False:
        yes.add("dead"); no.add("alive")
    if "all_rounder" not in jobs and "cricketer" in jobs:
        no.add("all_rounder")
    for job in JOBS:
        if job not in yes:
            no.add(job)
    return {
        "id": qid, "en": en, "bn": bn, "pop": pop, "kind": "real", "adult": False,
        "yes": sorted(yes), "no": sorted(no - yes), "aliases": list(aliases),
    }


def character(id_, en, bn, pop, yes, no=(), qid="", aliases=()):
    yes, no = set(yes), set(no)
    yes.update(("fictional", "named"))
    no.update(("real", "object", "adult_ent"))
    if "male" in yes:
        no.add("female")
    if "female" in yes:
        no.add("male")
    record = {
        "id": qid or id_, "en": en, "bn": bn, "pop": pop, "kind": "fiction", "adult": False,
        "yes": sorted(yes), "no": sorted(no - yes), "aliases": list(aliases),
    }
    if qid:
        record["id"] = qid
    return record


def animal(id_, en, bn, pop, yes, no=(), qid="", aliases=()):
    yes, no = set(yes), set(no)
    yes.add("animal")
    no.update(("real", "fictional", "object", "named", "adult_ent"))
    return {
        "id": qid or id_, "en": en, "bn": bn, "pop": pop, "kind": "animal", "adult": False,
        "yes": sorted(yes), "no": sorted(no - yes), "aliases": list(aliases),
    }


def thing(id_, en, bn, pop, yes, no=(), qid="", aliases=()):
    yes, no = set(yes), set(no)
    yes.add("object")
    no.update(("real", "fictional", "animal", "named", "adult_ent"))
    if "uses_pressure" not in yes:
        no.add("uses_pressure")
    return {
        "id": qid or id_, "en": en, "bn": bn, "pop": pop, "kind": "object", "adult": False,
        "yes": sorted(yes), "no": sorted(no - yes), "aliases": list(aliases),
    }


def curated_entities():
    rows = []
    rows.append(person(
        "Q266104", "Shakib Al Hasan", "সাকিব আল হাসান", 420,
        year=1987, country="from_bd", gender="male", alive=True,
        jobs=("cricketer", "all_rounder"),
        aliases=("Shakib", "সাকিব", "সাকিব আল হাসান"),
    ))
    rows.append(person("c-tamim", "Tamim Iqbal", "তামিম ইকবাল", 180, year=1989, country="from_bd", gender="male", alive=True, jobs=("cricketer",), aliases=("তামিম",)))
    rows.append(person("c-mashrafe", "Mashrafe Mortaza", "মাশরাফি মুর্তজা", 170, year=1983, country="from_bd", gender="male", alive=True, jobs=("cricketer",), aliases=("মাশরাফি",)))
    rows.append(person("c-mushfiqur", "Mushfiqur Rahim", "মুশফিকুর রহিম", 140, year=1987, country="from_bd", gender="male", alive=True, jobs=("cricketer",), aliases=("মুশফিকুর",)))
    rows.append(person("Q213854", "Virat Kohli", "বিরাট কোহলি", 500, year=1988, country="from_in", gender="male", alive=True, jobs=("cricketer",), aliases=("কোহলি", "বিরাট")))
    rows.append(person("c-dhoni", "MS Dhoni", "মাহেন্দ্র সিং ধোনি", 480, year=1981, country="from_in", gender="male", alive=True, jobs=("cricketer",), aliases=("ধোনি", "Dhoni", "Mahendra Singh Dhoni")))
    rows.append(person("c-sachin", "Sachin Tendulkar", "শচীন তেন্ডুলকর", 520, year=1973, country="from_in", gender="male", alive=True, jobs=("cricketer",), aliases=("শচীন", "Tendulkar")))
    rows.append(person("Q12052777", "Humayun Ahmed", "হুমায়ূন আহমেদ", 260, year=1948, country="from_bd", gender="male", alive=False, jobs=("writer", "director"), aliases=("হুমায়ূন",)))
    rows.append(person("Q285203", "Muhammed Zafar Iqbal", "মুহম্মদ জাফর ইকবাল", 180, year=1952, country="from_bd", gender="male", alive=True, jobs=("writer", "scientist"), aliases=("জাফর ইকবাল", "Zafar Iqbal")))
    rows.append(person("Q7241", "Rabindranath Tagore", "রবীন্দ্রনাথ ঠাকুর", 600, year=1861, country="from_in", gender="male", alive=False, jobs=("writer",), aliases=("রবীন্দ্রনাথ", "Tagore", "কাব্যগুরু")))
    rows.append(person("c-nazrul", "Kazi Nazrul Islam", "কাজী নজরুল ইসলাম", 280, year=1899, country="from_bd", gender="male", alive=False, jobs=("writer", "singer", "musician"), aliases=("নজরুল", "Nazrul")))
    rows.append(person(
        "c-ilma-behroz", "Ilma Behroz", "ইলমা বেহরোজ", 90,
        year=2003, country="from_bd", gender="female", alive=True, jobs=("writer",),
        aliases=("Elma Behrouz", "Elma Behrooz", "ইলমা", "Ilma Behrooz"),
    ))
    rows.append(person(
        "c-nusrat-sejuti", "Nusrat Sultana Sejuti", "নুসরাত সুলতানা সেঁজুতি", 70,
        year=2001, country="from_bd", gender="female", alive=True, jobs=("writer",),
        aliases=("Nusrat Sejuti", "নুসরাত সেঁজুতি", "সেঁজুতি", "Nusrat Sultana Sezuti"),
    ))
    rows.append(person("c-bankim", "Bankim Chandra Chatterjee", "বঙ্কিমচন্দ্র চট্টোপাধ্যায়", 160, year=1838, country="from_in", gender="male", alive=False, jobs=("writer",), aliases=("বঙ্কিমচন্দ্র", "Bankim Chandra Chattopadhyay")))
    rows.append(person("c-sarat", "Sarat Chandra Chattopadhyay", "শরৎচন্দ্র চট্টোপাধ্যায়", 170, year=1876, country="from_in", gender="male", alive=False, jobs=("writer",), aliases=("শরৎচন্দ্র",)))
    rows.append(person("Q8873", "Satyajit Ray", "সত্যজিৎ রায়", 400, year=1921, country="from_in", gender="male", alive=False, jobs=("director", "writer"), aliases=("সত্যজিৎ",)))
    rows.append(person(
        "Q191375", "Sheikh Mujibur Rahman", "শেখ মুজিবুর রহমান", 500,
        year=1920, country="from_bd", gender="male", alive=False, jobs=("politician",),
        extra_yes=("party_al", "led_gov", "mujib_family"),
        extra_no=("party_bnp", "zia_family", "lives_abroad"),
        aliases=("বঙ্গবন্ধু", "মুজিব", "Sheikh Mujib"),
    ))
    # Facts below are the Wikidata claims checked for these items (birth, death, party, office, family).
    rows.append(person(
        "Q52183", "Sheikh Hasina", "শেখ হাসিনা", 480,
        year=1947, country="from_bd", gender="female", alive=True, jobs=("politician",),
        extra_yes=("party_al", "led_gov", "mujib_family"),
        extra_no=("party_bnp", "zia_family"),
        aliases=("Hasina", "হাসিনা"),
    ))
    rows.append(person(
        "Q234814", "Khaleda Zia", "খালেদা জিয়া", 420,
        year=1945, country="from_bd", gender="female", alive=False, jobs=("politician",),
        extra_yes=("party_bnp", "led_gov", "zia_family"),
        extra_no=("party_al", "mujib_family"),
        aliases=("Khaleda", "খালেদা"),
    ))
    rows.append(person(
        "Q198313", "Ziaur Rahman", "জিয়াউর রহমান", 300,
        year=1936, country="from_bd", gender="male", alive=False, jobs=("politician",),
        extra_yes=("party_bnp", "led_gov", "zia_family"),
        extra_no=("party_al", "mujib_family", "lives_abroad"),
        aliases=("জিয়া", "Zia"),
    ))
    rows.append(person(
        "Q7686199", "Tarique Rahman", "তারেক রহমান", 280,
        year=1968, country="from_bd", gender="male", alive=True, jobs=("politician",),
        extra_yes=("party_bnp", "led_gov", "zia_family"),
        extra_no=("party_al", "mujib_family", "lives_abroad"),
        aliases=("Tarek Rahman", "Tareq Rahman", "তারেক"),
    ))
    rows.append(person(
        "Q43969", "Muhammad Yunus", "মুহাম্মদ ইউনূস", 360,
        year=1940, country="from_bd", gender="male", alive=True, jobs=("politician", "scientist"),
        extra_yes=("led_gov",),
        extra_no=("party_bnp", "party_al", "zia_family", "mujib_family"),
        aliases=("Yunus", "ইউনূস"),
    ))
    rows.append(person(
        "Q7402629", "Sajeeb Wazed", "সজীব ওয়াজেদ", 150,
        year=1971, country="from_bd", gender="male", alive=True, jobs=("politician",),
        extra_yes=("party_al", "mujib_family"),
        extra_no=("party_bnp", "led_gov", "zia_family"),
        aliases=("Joy", "সজীব"),
    ))
    rows.append(person(
        "Q14325293", "Obaidul Quader", "ওবায়দুল কাদের", 170,
        year=1952, country="from_bd", gender="male", alive=True, jobs=("politician",),
        extra_yes=("party_al",),
        extra_no=("party_bnp", "led_gov", "zia_family", "mujib_family"),
        aliases=("কাদের",),
    ))
    rows.append(person(
        "Q6874839", "Mirza Fakhrul Islam Alamgir", "মির্জা ফখরুল ইসলাম আলমগীর", 190,
        year=1948, country="from_bd", gender="male", alive=True, jobs=("politician",),
        extra_yes=("party_bnp",),
        extra_no=("party_al", "led_gov", "zia_family", "mujib_family", "lives_abroad"),
        aliases=("Fakhrul", "ফখরুল"),
    ))
    rows.append(person(
        "Q1058", "Narendra Modi", "নরেন্দ্র মোদী", 520,
        year=1950, country="from_in", gender="male", alive=True, jobs=("politician",),
        extra_yes=("led_gov",),
        extra_no=("party_bnp", "party_al", "zia_family", "mujib_family", "from_bd"),
        aliases=("Modi", "মোদী", "মোদি"),
    ))
    rows.append(person("c-rokeya", "Begum Rokeya", "বেগম রোকেয়া", 150, year=1880, country="from_bd", gender="female", alive=False, jobs=("writer",), aliases=("রোকেয়া সাখাওয়াত হোসেন", "Rokeya", "Begum Rokeya Sakhawat Hossain")))

    rows.append(character("Q5765519", "Himu", "হিমু", 160, {
        "male", "from_novel", "from_bengali_lit", "by_humayun", "wears_yellow", "talks",
    }, {"female", "animal", "from_anime", "from_game", "from_cartoon", "from_comics", "detective_role", "superhero", "by_zafar", "by_ray", "chases_mouse"}, aliases=("Himu", "হিমু")))
    rows.append(character("c-misir-ali", "Misir Ali", "মিসির আলি", 140, {
        "male", "from_novel", "from_bengali_lit", "by_humayun", "detective_role", "talks",
    }, {"female", "wears_yellow", "from_anime", "from_cartoon", "from_game", "superhero", "by_zafar", "by_ray", "animal"}))
    rows.append(character("c-shuvro", "Shuvro", "শুভ্র", 80, {
        "male", "from_novel", "from_bengali_lit", "by_humayun", "talks",
    }, {"female", "wears_yellow", "detective_role", "by_zafar", "by_ray", "from_anime", "animal"}))
    rows.append(character("c-dipu", "Dipu", "দিপু", 70, {
        "male", "from_novel", "from_bengali_lit", "by_zafar", "talks",
    }, {"female", "by_humayun", "by_ray", "detective_role", "wears_yellow", "from_anime", "animal"}, aliases=("Dipu Number Two",)))
    rows.append(character("c-feluda", "Feluda", "ফেলুদা", 200, {
        "male", "from_novel", "from_film", "from_bengali_lit", "by_ray", "detective_role", "talks",
    }, {"female", "by_humayun", "by_zafar", "wears_yellow", "from_anime", "animal", "superhero"}, aliases=("প্রদোষ চন্দ্র মিত্র", "Pradosh C. Mitter")))
    rows.append(character("c-topshe", "Topshe", "তোপসে", 90, {
        "male", "from_novel", "from_film", "from_bengali_lit", "by_ray", "talks",
    }, {"female", "detective_role", "by_humayun", "wears_yellow", "animal"}))
    rows.append(character("c-jatayu", "Jatayu", "জটায়ু", 90, {
        "male", "from_novel", "from_film", "from_bengali_lit", "by_ray", "talks",
    }, {"female", "detective_role", "by_humayun", "wears_yellow"}, aliases=("Lalmohan Ganguly", "লালমোহন গাঙ্গুলী")))
    rows.append(character("c-shonku", "Professor Shonku", "প্রফেসর শঙ্কু", 120, {
        "male", "from_novel", "from_bengali_lit", "by_ray", "scientist", "talks",
    }, {"female", "detective_role", "by_humayun", "wears_yellow", "from_anime"}))
    rows.append(character("c-byomkesh", "Byomkesh Bakshi", "ব্যোমকেশ বক্সী", 150, {
        "male", "from_novel", "from_film", "from_bengali_lit", "detective_role", "talks",
    }, {"female", "by_humayun", "by_ray", "by_zafar", "wears_yellow", "from_anime"}))
    rows.append(character("c-apu", "Apu", "অপু", 100, {
        "male", "from_novel", "from_film", "from_bengali_lit", "talks",
    }, {"female", "detective_role", "by_humayun", "superhero"}, aliases=("Apu Roy",)))
    rows.append(character("c-devdas", "Devdas", "দেবদাস", 130, {
        "male", "from_novel", "from_film", "from_bengali_lit", "talks",
    }, {"female", "detective_role", "by_humayun", "by_ray"}))
    rows.append(character("c-paro", "Parvati", "পার্বতী", 80, {
        "female", "from_novel", "from_film", "from_bengali_lit", "talks",
    }, {"male", "detective_role"}, aliases=("Paro", "পারু")))
    rows.append(character("c-gora", "Gora", "গোরা", 70, {
        "male", "from_novel", "from_bengali_lit", "talks",
    }, {"female", "detective_role", "by_humayun", "from_cartoon"}))
    rows.append(character("c-tenida", "Tenida", "তেনিদা", 90, {
        "male", "from_novel", "from_bengali_lit", "talks",
    }, {"female", "detective_role", "by_humayun", "by_ray", "wears_yellow"}))
    rows.append(character("c-poddoja", "Poddoja", "পদ্মজা", 60, {
        "female", "from_novel", "from_bengali_lit", "talks",
    }, {"male", "detective_role", "by_humayun", "by_zafar", "by_ray", "from_cartoon", "from_anime"}, aliases=("পদ্মজা",)))

    def hero(id_, en, bn, pop, yes, no=(), aliases=()):
        base_no = {"from_bengali_lit", "by_humayun", "by_zafar", "by_ray", "wears_yellow", "animal", "is_cat", "is_mouse"}
        return character(id_, en, bn, pop, yes, set(no) | base_no, aliases=aliases)

    rows.extend([
        hero("Q1337-skip", "Sherlock Holmes", "শার্লক হোমস", 700, {"male", "from_novel", "from_film", "detective_role", "talks"}, {"female", "superhero", "from_anime"}, aliases=("Sherlock", "শার্লক")),
        hero("c-watson", "Dr Watson", "ডা. ওয়াটসন", 200, {"male", "from_novel", "from_film", "talks"}, {"female", "detective_role", "superhero"}),
        hero("c-harry", "Harry Potter", "হ্যারি পটার", 800, {"male", "from_novel", "from_film", "talks", "superhero"}, {"female", "detective_role", "from_anime"}, aliases=("Harry", "হ্যারি")),
        hero("c-hermione", "Hermione Granger", "হারমায়োনি গ্রেঞ্জার", 400, {"female", "from_novel", "from_film", "talks"}, {"male", "from_anime"}),
        hero("c-frodo", "Frodo Baggins", "ফ্রোডো", 250, {"male", "from_novel", "from_film", "talks"}, {"female", "superhero"}),
        hero("c-gandalf", "Gandalf", "গ্যান্ডালফ", 280, {"male", "from_novel", "from_film", "talks", "superhero"}, {"female"}),
        hero("c-hamlet", "Hamlet", "হ্যামলেট", 300, {"male", "from_novel", "from_film", "talks"}, {"female", "superhero", "detective_role"}),
        hero("c-elizabeth", "Elizabeth Bennet", "এলিজাবেথ বেনেট", 180, {"female", "from_novel", "from_film", "talks"}, {"male", "superhero"}),
        hero("c-alice", "Alice", "অ্যালিস", 220, {"female", "from_novel", "from_film", "talks"}, {"male"}, aliases=("Alice in Wonderland",)),
        hero("c-quixote", "Don Quixote", "ডন কিহোতে", 200, {"male", "from_novel", "talks"}, {"female", "from_anime"}),
    ])
    # Fix sherlock id - I used a bad placeholder. Replace.
    rows[-10]["id"] = "c-sherlock"

    cartoon_no = {"from_bengali_lit", "by_humayun", "by_zafar", "by_ray", "from_novel", "from_anime", "from_game", "wears_yellow"}
    rows.append(character("Q1839152", "Tom", "টম", 360, {
        "male", "animal", "is_cat", "mammal", "from_cartoon", "from_film", "chases_mouse", "grey", "pet",
    }, cartoon_no | {"female", "talks", "orange", "white_color", "from_comics", "is_dog", "is_mouse", "superhero", "detective_role"}, aliases=("Tom Cat", "টম ক্যাট")))
    rows.append(character("c-jerry", "Jerry", "জেরি", 300, {
        "male", "animal", "is_mouse", "mammal", "from_cartoon", "from_film",
    }, cartoon_no | {"female", "is_cat", "chases_mouse", "talks", "is_dog"}, aliases=("Jerry Mouse",)))
    rows.append(character("c-garfield", "Garfield", "গারফিল্ড", 220, {
        "male", "animal", "is_cat", "mammal", "from_comics", "from_cartoon", "orange", "talks", "pet",
    }, {"female", "from_anime", "from_bengali_lit", "chases_mouse", "grey", "is_mouse", "by_humayun"}))
    rows.append(character("c-mickey", "Mickey Mouse", "মিকি মাউস", 500, {"male", "animal", "is_mouse", "from_cartoon", "from_film", "talks"}, {"female", "is_cat", "from_anime", "from_bengali_lit"}))
    rows.append(character("c-donald", "Donald Duck", "ডonald ডাক", 280, {"male", "animal", "bird", "from_cartoon", "from_film", "talks", "can_fly"}, {"female", "is_cat", "from_anime", "mammal"}))
    rows[-1]["bn"] = "ডোনাল্ড ডাক"
    rows.append(character("c-scooby", "Scooby-Doo", "স্কুবি-ডু", 200, {"male", "animal", "is_dog", "mammal", "from_cartoon", "talks", "pet"}, {"female", "is_cat", "from_anime"}))
    rows.append(character("c-homer", "Homer Simpson", "হোমার সিম্পসন", 320, {"male", "from_cartoon", "from_film", "talks"}, {"female", "animal", "from_anime", "superhero"}))
    rows.append(character("c-bart", "Bart Simpson", "বার্ট সিম্পসন", 260, {"male", "from_cartoon", "talks"}, {"female", "animal", "from_anime"}))
    rows.append(character("c-spongebob", "SpongeBob SquarePants", "স্পঞ্জবব", 340, {"male", "from_cartoon", "talks", "water_life", "yellow"}, {"female", "animal", "from_anime", "is_cat"}))
    # yellow isn't a question; white/orange/grey/black are. Leave color unknown.
    rows.append(character("c-doraemon", "Doraemon", "ডোরেমন", 380, {"male", "from_anime", "from_cartoon", "talks", "robotish"}, {"female", "from_bengali_lit", "animal"}))
    rows.append(character("c-nobita", "Nobita", "নোবিতা", 260, {"male", "from_anime", "from_cartoon", "talks"}, {"female", "animal", "superhero"}))
    rows.append(character("c-pikachu", "Pikachu", "পিকাচু", 420, {"animal", "mammal", "from_anime", "from_game", "from_cartoon", "yellowish"}, {"from_bengali_lit", "is_cat", "is_dog", "from_novel"}))
    rows.append(character("c-naruto", "Naruto Uzumaki", "নারুটো", 400, {"male", "from_anime", "talks", "superhero"}, {"female", "from_cartoon", "animal", "from_novel"}))
    rows.append(character("c-goku", "Goku", "গোকু", 410, {"male", "from_anime", "talks", "superhero"}, {"female", "animal", "from_cartoon", "from_novel"}))
    rows.append(character("c-luffy", "Monkey D. Luffy", "লুফি", 390, {"male", "from_anime", "talks", "superhero"}, {"female", "animal", "from_cartoon"}))
    rows.append(character("c-mario", "Mario", "মারিও", 450, {"male", "from_game", "talks"}, {"female", "from_anime", "animal", "from_bengali_lit"}, aliases=("Super Mario",)))
    rows.append(character("c-luigi", "Luigi", "লুইজি", 200, {"male", "from_game", "talks"}, {"female", "from_anime", "animal"}))
    rows.append(character("c-link", "Link", "লিংক", 280, {"male", "from_game", "superhero"}, {"female", "from_anime", "talks", "animal"}))
    rows.append(character("c-sonic", "Sonic the Hedgehog", "সনিক", 260, {"male", "animal", "from_game", "from_cartoon"}, {"female", "is_cat", "from_anime", "from_novel"}))
    rows.append(character("c-batman", "Batman", "ব্যাটম্যান", 480, {"male", "from_comics", "from_film", "superhero", "talks"}, {"female", "from_anime", "animal"}))
    rows.append(character("c-superman", "Superman", "সুপারম্যান", 460, {"male", "from_comics", "from_film", "superhero", "talks"}, {"female", "animal", "from_anime"}))
    rows.append(character("c-spiderman", "Spider-Man", "স্পাইডার-ম্যান", 470, {"male", "from_comics", "from_film", "superhero", "talks"}, {"female", "animal"}))
    rows.append(character("c-elsa", "Elsa", "এলসা", 300, {"female", "from_film", "from_cartoon", "talks", "superhero"}, {"male", "from_anime", "animal"}))
    rows.append(character("c-simba", "Simba", "সিম্বা", 240, {"male", "animal", "is_cat", "mammal", "from_film", "from_cartoon", "talks"}, {"female", "pet", "from_anime", "chases_mouse"}))
    rows.append(character("c-woody", "Woody", "উডি", 180, {"male", "from_film", "from_cartoon", "talks"}, {"female", "animal", "superhero"}))
    rows.append(character("c-kitty", "Hello Kitty", "হ্যালো কিটি", 260, {"female", "animal", "is_cat", "from_cartoon", "white_color", "pet"}, {"male", "talks", "from_anime", "chases_mouse", "grey"}))
    rows.append(character("c-tintin", "Tintin", "টিনটিন", 240, {"male", "from_comics", "talks"}, {"female", "from_anime", "superhero", "animal"}))

    rows.append(animal("Q146", "Cat", "বিড়াল", 650, {
        "mammal", "is_cat", "pet",
    }, {"wild", "bird", "fish", "reptile", "insect", "is_dog", "is_mouse", "can_fly", "water_life", "bigger_than_person", "farm"}, aliases=("cat", "house cat", "বিড়াল", "বেড়াল")))
    rows.append(animal("Q144", "Dog", "কুকুর", 640, {"mammal", "is_dog", "pet"}, {"wild", "is_cat", "is_mouse", "bird", "can_fly", "bigger_than_person"}, aliases=("dog", "কুকুর")))
    rows.append(animal("c-tiger", "Tiger", "বাঘ", 300, {"mammal", "is_cat", "wild", "bigger_than_person"}, {"pet", "is_dog", "bird", "can_fly"}, aliases=("বাঘ",)))
    rows.append(animal("c-lion", "Lion", "সিংহ", 280, {"mammal", "is_cat", "wild", "bigger_than_person"}, {"pet", "is_dog", "bird"}, aliases=("সিংহ",)))
    rows.append(animal("c-elephant", "Elephant", "হাতি", 260, {"mammal", "wild", "bigger_than_person"}, {"pet", "is_cat", "is_dog", "can_fly"}, aliases=("হাতি",)))
    rows.append(animal("c-cow", "Cow", "গরু", 220, {"mammal", "farm"}, {"wild", "pet", "is_cat", "can_fly", "bigger_than_person"}, aliases=("গরু",)))
    rows.append(animal("c-goat", "Goat", "ছাগল", 120, {"mammal", "farm"}, {"wild", "is_cat", "is_dog", "bigger_than_person"}, aliases=("ছাগল",)))
    rows.append(animal("c-horse", "Horse", "ঘোড়া", 200, {"mammal", "farm", "bigger_than_person"}, {"is_cat", "pet", "can_fly"}, aliases=("ঘোড়া",)))
    rows.append(animal("c-crow", "Crow", "কাক", 140, {"bird", "can_fly", "wild", "black_color"}, {"mammal", "pet", "is_cat", "water_life"}, aliases=("কাক",)))
    rows.append(animal("c-pigeon", "Pigeon", "কবুতর", 100, {"bird", "can_fly"}, {"mammal", "is_cat", "water_life", "bigger_than_person"}, aliases=("কবুতর",)))
    rows.append(animal("c-hilsa", "Hilsa", "ইলিশ", 160, {"fish", "water_life"}, {"mammal", "bird", "can_fly", "pet", "bigger_than_person"}, aliases=("ilish", "ইলিশ মাছ")))
    rows.append(animal("c-goldfish", "Goldfish", "গোল্ডফিশ", 90, {"fish", "water_life", "pet", "orange"}, {"mammal", "can_fly", "bigger_than_person"}))
    rows.append(animal("c-snake", "Snake", "সাপ", 150, {"reptile", "wild"}, {"mammal", "bird", "pet", "can_fly", "is_cat"}, aliases=("সাপ",)))
    rows.append(animal("c-frog", "Frog", "ব্যাঙ", 80, {"water_life"}, {"mammal", "bird", "is_cat", "bigger_than_person"}, aliases=("ব্যাঙ",)))
    rows.append(animal("c-parrot", "Parrot", "টিয়া", 110, {"bird", "can_fly", "pet", "talks"}, {"mammal", "is_cat", "bigger_than_person"}, aliases=("তোতা",)))
    rows.append(animal("c-rat", "Rat", "ইঁদুর", 100, {"mammal", "is_mouse"}, {"pet", "is_cat", "bird", "bigger_than_person", "can_fly"}, aliases=("ইঁদুর", "mouse")))

    def obj(id_, en, bn, pop, yes, extra_no=(), qid="", aliases=()):
        return thing(id_, en, bn, pop, set(yes), set(extra_no), qid=qid, aliases=aliases)

    rows.append(obj(
        "Q271997", "Pressure cooker", "প্রেসার কুকার", 160,
        {"kitchen", "metal", "container", "cooking", "uses_pressure", "tool", "handheld", "daily_use"},
        {"electronic", "clothing", "vehicle", "food", "furniture", "pocket", "soft", "music_item", "sport_item", "bigger_than_person"},
        aliases=("প্রেসার কুকার", "pressure cooker", "কুকার"),
    ))
    rows.append(obj("c-pot", "Cooking pot", "হাড়ি", 90, {"kitchen", "metal", "container", "cooking", "tool", "handheld", "daily_use"}, {"electronic", "uses_pressure", "pocket", "clothing", "vehicle"}, aliases=("হাঁড়ি", "saucepan", "dekchi", "ডেকচি")))
    rows.append(obj("c-kettle", "Kettle", "কেটলি", 80, {"kitchen", "metal", "container", "cooking", "handheld"}, {"uses_pressure", "electronic", "clothing", "vehicle", "furniture"}))
    rows.append(obj("c-rice-cooker", "Rice cooker", "রাইস কুকার", 100, {"kitchen", "electronic", "container", "cooking", "daily_use"}, {"uses_pressure", "clothing", "vehicle", "pocket", "metal"}))
    rows.append(obj("c-fridge", "Refrigerator", "ফ্রিজ", 140, {"kitchen", "electronic", "bigger_than_person", "daily_use"}, {"handheld", "pocket", "cooking", "clothing", "vehicle", "uses_pressure"}, aliases=("fridge", "ফ্রিজ")))
    rows.append(obj("c-phone", "Mobile phone", "মোবাইল ফোন", 200, {"electronic", "handheld", "pocket", "daily_use"}, {"kitchen", "cooking", "clothing", "vehicle", "furniture", "uses_pressure", "metal"}, aliases=("phone", "মোবাইল")))
    rows.append(obj("c-tv", "Television", "টেলিভিশন", 150, {"electronic", "daily_use"}, {"pocket", "handheld", "cooking", "clothing", "vehicle", "uses_pressure"}, aliases=("TV", "টিভি")))
    rows.append(obj("c-fan", "Electric fan", "পাখা", 90, {"electronic", "daily_use"}, {"pocket", "cooking", "vehicle", "clothing", "uses_pressure"}, aliases=("ফ্যান", "পাখা")))
    rows.append(obj("c-shirt", "Shirt", "শার্ট", 80, {"clothing", "soft", "daily_use", "handheld"}, {"electronic", "kitchen", "metal", "vehicle", "uses_pressure"}))
    rows.append(obj("c-sari", "Sari", "শাড়ি", 110, {"clothing", "soft", "handheld"}, {"electronic", "kitchen", "metal", "vehicle", "pocket"}, aliases=("শাড়ি", "saree")))
    rows.append(obj("c-bicycle", "Bicycle", "সাইকেল", 120, {"vehicle", "metal", "sport_item", "daily_use"}, {"electronic", "kitchen", "pocket", "clothing", "uses_pressure"}, aliases=("সাইকেল", "bike")))
    rows.append(obj("c-rickshaw", "Rickshaw", "রিকশা", 100, {"vehicle", "daily_use", "bigger_than_person"}, {"electronic", "kitchen", "pocket", "clothing", "uses_pressure"}, aliases=("রিকশা",)))
    rows.append(obj("c-car", "Car", "গাড়ি", 180, {"vehicle", "metal", "bigger_than_person", "daily_use"}, {"handheld", "pocket", "kitchen", "clothing"}, aliases=("কার", "মোটরগাড়ি")))
    rows.append(obj("c-football", "Football", "ফুটবল", 90, {"sport_item", "handheld"}, {"electronic", "kitchen", "vehicle", "clothing", "metal", "uses_pressure"}, aliases=("soccer ball",)))
    rows.append(obj("c-bat", "Cricket bat", "ক্রিকেট ব্যাট", 80, {"sport_item", "handheld"}, {"electronic", "kitchen", "metal", "vehicle", "uses_pressure"}, aliases=("ব্যাট",)))
    rows.append(obj("c-book", "Book", "বই", 140, {"handheld", "daily_use"}, {"electronic", "kitchen", "metal", "vehicle", "clothing", "uses_pressure"}, aliases=("বই",)))
    rows.append(obj("c-umbrella", "Umbrella", "ছাতা", 70, {"handheld", "daily_use"}, {"electronic", "kitchen", "vehicle", "food", "uses_pressure"}, aliases=("ছাতা",)))
    rows.append(obj("c-guitar", "Guitar", "গিটার", 90, {"music_item", "handheld"}, {"electronic", "kitchen", "vehicle", "clothing", "uses_pressure"}, aliases=("গিটার",)))
    return rows
