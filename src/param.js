const { User } = require('discord.js');

const commands = require('./commands');
const Message = require('./message');


/**
 * @typedef {{
 *   filter?: (msg: Message) => boolean, 
 *   sort?: (m1: Message, m2: Message) => number,
 * }} Param
 */

/** @implements {Param} */
class DateParam {
    constructor(opts) {
        /** @type {Date} */
        this.date0 = opts.date0 == null ? new Date(0) : opts.date0;
        /** @type {Date} */
        this.date1 = opts.date1 == null ? new Date(Date.now() + 1) : opts.date1;
    }

    static options(){
        return [
            { name: "date0", type: commands.OptionType.date, req: false, descr: "Time period start" },
            { name: "date1", type: commands.OptionType.date, req: false, descr: "Time period end" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return msg.date >= this.date0 && msg.date <= this.date1;
    }
}

/** @implements {Param} */
class AuthorParam {
    constructor(opts) {
        /** @type {User} */
        this.author = opts.author;
    }

    static options(){
        return [
            { name: "author", type: commands.OptionType.user, req: false, descr: "Post author" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return this.author == null ? true : (msg.author.tag == this.author.tag);
    }
}

/** @implements {Param} */
class GradeAmountParam {
    constructor(opts) {
        /** @type {number} */
        this.grade_amount0 = opts.grade_amount0 == null ? -1 : opts.grade_amount0;
        /** @type {number} */
        this.grade_amount1 = opts.grade_amount1 == null ? 65535 : opts.grade_amount1;
    }

    static options(){
        return [
            { name: "grade_amount0", type: commands.OptionType.integer, req: false, descr: "Minimum amount of grades per post" },
            { name: "grade_amount1", type: commands.OptionType.integer, req: false, descr: "Maximum amount of grades per post" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return msg.rate.count() >= this.grade_amount0 && msg.rate.count() <= this.grade_amount1;
    }
}

/** @implements {Param} */
class AverageScoreRangeParam {
    constructor(opts) {
        /** @type {number} */
        this.score_range0 = opts.score_range0 == null ? -1000.0 : opts.score_range0;
        /** @type {number} */
        this.score_range1 = opts.score_range1 == null ? 1000.0 : opts.score_range1;
    }

    static options(){
        return [
            { name: "score_range0", type: commands.OptionType.float, req: false, descr: "Minimum average score" },
            { name: "score_range1", type: commands.OptionType.float, req: false, descr: "Maximum average score" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return msg.averageScore() >= this.score_range0 && msg.averageScore() <= this.score_range1;
    }
}

/** @implements {Param} */
class IndividualScoreRangeParam {
    constructor(opts) {
        /** @type {number} */
        this.grade_range0 = opts.grade_range0 == null ? -1000.0 : opts.grade_range0;
        /** @type {number} */
        this.grade_range1 = opts.grade_range1 == null ? 1000.0 : opts.grade_range1;
    }

    static options(){
        return [
            { name: "grade_range0", type: commands.OptionType.float, req: false, descr: "Minimum individual grade" },
            { name: "grade_range1", type: commands.OptionType.float, req: false, descr: "Maximum individual grade" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return msg.rate.data.every(r => r.value >= this.grade_range0 && r.value <= this.grade_range1);
    }
}

/** @implements {Param} */
class JuryParam {
    constructor(opts) {
        /** @type {User} */
        this.jury = opts.jury;
    }

    static options(){
        return [
            { name: "jury", type: commands.OptionType.user, req: false, descr: "User whose grades will be used (instead of all users' by default)" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return this.jury == null ? true : (msg.userScore(this.jury.tag) != null);
    }

    /**
     * @param {Message} m1
     * @param {Message} m2
     * @returns {number}
     */
    sort(m1, m2) {
        if(this.jury == null) return 0;
        return m1.userScore(this.jury.tag) - m2.userScore(this.jury.tag);
    }
}

/** @implements {Param} */
class SpecialParam {
    constructor(opts) {
        /** @type {boolean} */
        this.special = opts.special == null ? false : opts.special;
    }

    static options(){
        return [
            { name: "special", type: commands.OptionType.boolean, req: false, descr: "Use only posts marked with special reactions" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        return (this.special && msg.rate.skip) ||
            (!this.special && !msg.rate.skip);
    }
}

/** @implements {Param} */
class UnityParam {
    constructor(opts) {
        /** @type {number} */
        this.scatter = opts.scatter == null ? 65535 : opts.scatter;
    }

    static options(){
        return [
            { name: "scatter", type: commands.OptionType.float, req: false, descr: "Use posts with grades with deviation from avg less than specified" },
        ];
    }

    /** @param {Message} msg */
    filter(msg) {
        const some_grade = msg.averageScore();
        return msg.rate.data.every(other_grade => Math.abs(other_grade.value - some_grade) < this.scatter);
    }
}

module.exports = {
    /**
     * @param {Param[]} params 
     * @param {Message[]} messages 
     * @returns {Message[]}
     */
    filter(params, messages) {
        return messages.filter(x => params.every(p => p.filter == null || p.filter(x)));
    },

    /**
     * @param {Param[]} params 
     * @param {Message[]} messages
     * @returns {Message[]}
     */
    sort(params, messages) {
        return messages.sort((m1, m2) => {
            for(let pi = 0; pi < params.length; ++pi) {
                const param = params[pi];
                if(param.sort == null) continue;
                const val = param.sort(m1, m2);
                if(Math.abs(val) <= 0.00001) continue;
                return val;
            }
            return m1.averageScore() - m2.averageScore();
        });
    },

    /**
     * @param {any[]} spec
     * @returns {import('./commands').OptionDescr[]}
     */
    initoptd(spec) {
        /** @type {import('./commands').OptionDescr[]} */
        const optd = []
        for(let i = 0; i < spec.length; ++i) {
            optd.push(...spec[i].options());
        }
        return optd;
    },


    /**
     * @param {any[]} spec
     * @returns {Param[]}
     */
    initcmd(spec, opts) {
        /** @type {Param[]} */
        const params = []
        for(let i = 0; i < spec.length; ++i) {
            params.push(new spec[i](opts));
        }
        return params;
    },

    v: {
        DateParam,
        JuryParam,
        GradeAmountParam,
        SpecialParam,
        AverageScoreRangeParam,
        IndividualScoreRangeParam,
        AuthorParam,
        UnityParam,
    }
};
