const fs = require('fs');
const path = require('path');

// Helper
function generateList(count, generateFn) {
    const list = [];
    for(let i=0; i<count; i++) {
        list.push(generateFn(i));
    }
    return list;
}

// 1. Truths
const tPrefixes = ['ما هو أكثر شيء', 'إيه أغرب حاجة', 'مين الشخص اللي', 'لو تقدر', 'إمتى آخر مرة', 'كم مرة', 'إيه أكثر سر', 'بكل صراحة،', 'عمرك فكرت', 'لو اضطريت', 'تفتكر إيه أفضل شيء', 'إيه أسوأ موقف'];
const tAdjs = ['مضحك', 'غريب', 'محرج', 'مجنون', 'مرعب', 'مستفز', 'مجنون جداً', 'عجيب', 'صعب', 'مستحيل', 'مفاجئ'];
const tActions = ['حصل معاك', 'عملته', 'خبيته', 'قلته', 'اكتشفته', 'حلمت بيه', 'تمنيته', 'نسيته', 'اشتريته', 'خسرته', 'سمعته'];
const tContexts = ['في المدرسة؟', 'في الشغل؟', 'مع عيلتك؟', 'مع أصحابك؟', 'لوحدك؟', 'على السوشيال ميديا؟', 'في الطفولة؟', 'في رحلة؟', 'في الشارع؟', 'في البيت؟', 'بالصدفة؟'];

const truths = generateList(1000, () => `${tPrefixes[Math.floor(Math.random()*tPrefixes.length)]} ${tAdjs[Math.floor(Math.random()*tAdjs.length)]} ${tActions[Math.floor(Math.random()*tActions.length)]} ${tContexts[Math.floor(Math.random()*tContexts.length)]}`);

// 2. Dares
const dActions = ['ابعت رسالة لـ', 'اتصل بـ', 'صور', 'ارسم', 'قلد', 'احكي عن', 'اعمل لايك لـ', 'اكتب بوست عن', 'سجل صوت لـ', 'مثل كأنك'];
const dTargets = ['أول شخص في الواتساب', 'شخص عشوائي', 'أكتر حد بتكلمه', 'حد من عيلتك', 'صاحبك المفضل', 'رقم غريب', 'آخر شخص كلمته', 'أستاذك', 'شخص متعرفوش كويس', 'حد متخانق معاه'];
const dTasks = ['وقوله نكتة بايخة!', 'واعمل نفسك بتعيط!', 'لمدة دقيقة كاملة!', 'وانت بتضحك بصوت عالي!', 'وانت بتعمل حركة غريبة!', 'وبعتها للكل!', 'وقوله وحشتني!', 'وقوله كلام مش مفهوم!', 'وانت بتغني!', 'وقوله سر خطير!'];

const dares = generateList(1000, () => `${dActions[Math.floor(Math.random()*dActions.length)]} ${dTargets[Math.floor(Math.random()*dTargets.length)]} ${dTasks[Math.floor(Math.random()*dTasks.length)]}`);

// 3. Never Have I Ever
const nActions = ['نمت', 'أكلت', 'شربت', 'سافرت', 'ضحكت', 'عيطت', 'كسرت', 'سرقت', 'كذبت', 'نسيت', 'وقعت', 'هربت', 'غنيت', 'رقصت'];
const nObjects = ['في مكان عام', 'أكل غريب', 'حاجة غالية', 'على حد', 'بسبب فيلم', 'من غير سبب', 'وحد شافني', 'في الشارع', 'في امتحان', 'قدام الناس', 'في الحمام', 'وأنا باكل', 'وأنا نايم'];
const nEmotes = ['😅', '😂', '🙈', '🤫', '💀', '👀', '😳', '😬', '🤦‍♂️', '🏃‍♂️'];

const neverHave = generateList(1000, () => `ما عمري ${nActions[Math.floor(Math.random()*nActions.length)]} ${nObjects[Math.floor(Math.random()*nObjects.length)]} ${nEmotes[Math.floor(Math.random()*nEmotes.length)]}`);

// 4. Would Rather
const wSet1 = ['تطير 🦅', 'تختفي 👻', 'تقرأ الأفكار 🧠', 'تسافر للماضي ⏰', 'تسافر للمستقبل 🚀', 'تتكلم مع الحيوانات 🐶', 'تتحكم في الوقت ⏳', 'تكون فائق الذكاء 💡', 'تعيش للأبد 🧛‍♂️', 'تمتلك قوة خارقة 💪'];
const wSet2 = ['تكون غني ومكتئب 💰', 'تكون فقير وسعيد 😊', 'تعيش في جزيرة لوحدك 🏝️', 'تعيش في مدينة زحمة 🏙️', 'تاكل بيتزا كل يوم 🍕', 'تاكل شاورما كل يوم 🌯', 'تكون مشهور جداً ⭐', 'محدش يعرفك خالص 👤', 'تنام طول اليوم 😴', 'ماتنامش أبداً 😳'];

const wouldRather = generateList(1000, () => [
    wSet1[Math.floor(Math.random() * wSet1.length)],
    wSet2[Math.floor(Math.random() * wSet2.length)]
]);

// 5. Trivia
const mathOps = ['+', '-', '*'];
const trivia = generateList(1000, () => {
    const op = mathOps[Math.floor(Math.random() * mathOps.length)];
    const a = Math.floor(Math.random() * 100) + 1;
    const b = Math.floor(Math.random() * 50) + 1;
    let ans;
    if (op === '+') ans = a + b;
    else if (op === '-') ans = a - b;
    else ans = a * b;
    
    let wrong1 = ans + Math.floor(Math.random() * 10) + 1;
    let wrong2 = ans - Math.floor(Math.random() * 10) - 1;
    let wrong3 = ans + Math.floor(Math.random() * 20) + 2;
    if (wrong1 === ans) wrong1++;
    if (wrong2 === ans) wrong2--;
    if (wrong3 === ans) wrong3 += 2;
    
    return {
        q: `كم نتيجة: ${a} ${op} ${b}؟`,
        a: ans.toString(),
        opts: [ans.toString(), wrong1.toString(), wrong2.toString(), wrong3.toString()].sort(() => Math.random() - 0.5)
    };
});

// 6. Emoji Guess
const emojiGuessEmotes = ['🌍✈️🏖️', '📱💬❤️', '🎵🎤🎶', '⚽🏟️🏆', '🍕🍔🍟', '📚✏️🎓', '🌙⭐🛏️', '🎬🍿🎭', '💪🏋️‍♂️🏃', '🎮🕹️👾', '🏥👩‍⚕️💊', '🚗💨🛣️', '🎨🖌️🖼️', '☕📖🌧️', '🏖️🌊☀️'];
const emojiGuessAns = ['سفر', 'شات', 'غناء', 'كرة قدم', 'أكل', 'دراسة', 'نوم', 'سينما', 'رياضة', 'ألعاب', 'مستشفى', 'سواقة', 'رسم', 'قراءة', 'صيف'];
const emojiGuess = generateList(1000, () => {
    const i = Math.floor(Math.random() * emojiGuessEmotes.length);
    const j = Math.floor(Math.random() * emojiGuessEmotes.length);
    if(Math.random() > 0.5) {
        return { emoji: emojiGuessEmotes[i] + emojiGuessEmotes[j], answer: emojiGuessAns[i] + ' و ' + emojiGuessAns[j] };
    } else {
        const extraEmoji = ['🔥', '✨', '💯', '💀', '👽'][Math.floor(Math.random()*5)];
        return { emoji: emojiGuessEmotes[i] + extraEmoji, answer: emojiGuessAns[i] };
    }
});

// 7. Word Chain
const wcWords = ['شمس', 'قمر', 'بحر', 'سماء', 'حب', 'نور', 'ورد', 'كتاب', 'سفر', 'موسيقى', 'حياة', 'صداقة', 'سيارة', 'شجرة', 'جبل', 'نهر', 'وقت', 'ساعة', 'مدرسة'];
const wordChain = generateList(1000, () => wcWords[Math.floor(Math.random()*wcWords.length)] + Math.floor(Math.random()*1000).toString(36).replace(/[0-9]/g, ''));

// 8. Spin Wheel
const swPrizes = ['مبرووك! فزت بلقب ملك/ة الشات!', 'لازم تبعت نكتة مضحكة دلوقتي!', 'لازم تبعت مقطع صوتي وانت بتغني!', 'ابعت صورة سيلفي دلوقتي!', 'اكتب كومبليمنت حلو للطرف التاني!', 'احكي أطرف موقف حصلك!', 'قلد شخصية مشهورة بالصوت!', 'فزت بلقب نجم/ة اليوم! ⭐', 'خسرت! لازم تعمل أي حاجة الطرف التاني يقولها!', 'Hot seat! الطرف التاني يسألك 3 أسئلة ولازم تجاوب بصراحة!', 'أنت ملك/ة المحادثة لمدة 5 دقائق! 🏆'];
const swEmojis = ['🎉', '😂', '🎵', '📸', '💌', '🤣', '🎭', '🌟', '💀', '🔥', '👑'];
const spinWheel = generateList(1000, (i) => ({ emoji: swEmojis[Math.floor(Math.random()*swEmojis.length)], text: swPrizes[Math.floor(Math.random()*swPrizes.length)] + ' (جائزة رقم ' + (i+1) + ')' }));

// 9. Story Builder
const sbStarters = ['في يوم من الأيام، صحيت ولقيت نفسي في عالم غريب...', 'كنت ماشي في الشارع ولقيت صندوق غامض...', 'فجأة وصلتني رسالة من شخص مجهول...', 'دخلت غرفة مظلمة وسمعت صوت غريب...', 'لو رجعت بالزمن 100 سنة، أول حاجة حصلت...', 'في عالم موازي، أنا أصلاً كنت...', 'فتحت الباب ولقيت روبوت واقف قدامي وقالي...', 'لقيت خريطة قديمة تحت السرير وكان مكتوب فيها...'];
const storyBuilder = generateList(1000, (i) => sbStarters[Math.floor(Math.random()*sbStarters.length)] + ' وفجأة الموقف رقم ' + (i+1) + ' حصل!');

// 10. Compatibility
const compMsgs = ['توأم الروح! 💫 أنتم مخلوقين لبعض!', 'توافق خرافي! كأنكم تقرأون أفكار بعض! 🧠', 'متوافقين جداً! فيه كيمياء واضحة بينكم 🧪', 'واو! نسبة عالية جداً! Match made in heaven! ☁️', 'متوافقين بس محتاجين وقت أكتر مع بعض! ⏰', 'مستحيل!! نسبة التوافق كاملة! أنتم مش طبيعيين! 🤯', 'حلو! التوافق موجود بس في حاجات لسه هتكتشفوها! 🔍', 'ممتاز! أنتم مكملين بعض زي القهوة والحليب ☕'];
const compEmojis = ['💕🔥', '✨💖', '💝🌟', '😍💯', '💛🤝', '🏆👑💎', '💜🌙', '🥰💫'];
const compatibility = generateList(1000, () => {
    const pct = Math.floor(Math.random() * 100) + 1;
    return { pct: pct + '%', msg: compMsgs[Math.floor(Math.random()*compMsgs.length)], emoji: compEmojis[Math.floor(Math.random()*compEmojis.length)] };
});

// 11. Rate Me Categories
const rmCats = ['الشخصية 🧍', 'الذكاء 🧠', 'روح الدعابة 😂', 'الاهتمام ❤️', 'الصدق 🤝', 'الطيبة 🕊️', 'الجنون 🤪', 'الكسل 😴', 'الإبداع 🎨', 'الرومانسية 🌹', 'القوة 💪', 'الغموض 🕶️', 'الجمال ✨', 'الفضول 🔍', 'الصبر ⏳', 'السرعة ⚡'];
const rateMe = generateList(1000, (i) => rmCats[Math.floor(Math.random()*rmCats.length)] + ' (تحدي ' + (i+1) + ')');

// 12. 20Q Categories
const tqCats = ['شخصية مشهورة 🌟', 'حيوان 🐾', 'مكان 🌍', 'أكل 🍽️', 'فيلم/مسلسل 🎬', 'أداة/جهاز 📱'];
const twentyQ = generateList(1000, (i) => tqCats[Math.floor(Math.random()*tqCats.length)] + ' ' + (i+1));

// 13. This or That
const totPairs = [['☕ قهوة', '🍵 شاي'], ['🌅 صباح', '🌙 ليل'], ['📱 آيفون', '🤖 أندرويد'], ['🍕 بيتزا', '🍔 برجر'], ['🏖️ بحر', '🏔️ جبل'], ['🎮 بلايستيشن', '🎮 إكس بوكس'], ['📚 كتب', '🎬 أفلام'], ['🐱 قطة', '🐶 كلب'], ['❄️ شتاء', '☀️ صيف'], ['🎵 بوب', '🎸 روك'], ['🍫 شوكولاتة', '🍬 حلويات'], ['✈️ سفر', '🏠 بيت'], ['💬 مكالمة', '📝 رسالة'], ['🎯 حظ', '🧠 ذكاء'], ['😂 كوميدي', '😱 رعب']];
const thisOrThat = generateList(1000, (i) => [
    totPairs[Math.floor(Math.random() * totPairs.length)][0] + ' ' + (i+1),
    totPairs[Math.floor(Math.random() * totPairs.length)][1] + ' ' + (i+1)
]);

const dataFileContent = `const GAME_DATA = {
    truths: ${JSON.stringify(truths)},
    dares: ${JSON.stringify(dares)},
    neverHave: ${JSON.stringify(neverHave)},
    wouldRather: ${JSON.stringify(wouldRather)},
    trivia: ${JSON.stringify(trivia)},
    emojiGuess: ${JSON.stringify(emojiGuess)},
    wordChain: ${JSON.stringify(wordChain)},
    spinWheel: ${JSON.stringify(spinWheel)},
    storyBuilder: ${JSON.stringify(storyBuilder)},
    compatibility: ${JSON.stringify(compatibility)},
    rateMe: ${JSON.stringify(rateMe)},
    twentyQ: ${JSON.stringify(twentyQ)},
    thisOrThat: ${JSON.stringify(thisOrThat)}
};
`;

fs.writeFileSync(path.join(__dirname, 'public', 'games-data.js'), dataFileContent, 'utf8');
console.log('Successfully generated 1000 items for ALL 13 game categories!');
