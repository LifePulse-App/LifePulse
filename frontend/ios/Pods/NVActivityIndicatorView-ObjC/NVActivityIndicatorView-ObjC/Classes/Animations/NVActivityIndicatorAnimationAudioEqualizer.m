#import "NVActivityIndicatorAnimationAudioEqualizer.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationAudioEqualizer

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CGFloat lineSize = size.width / 9;
    CGFloat x = (layer.bounds.size.width - lineSize * 7) / 2;
    CGFloat y = (layer.bounds.size.height - size.height) / 2;
    NSArray *durations = @[@(4.3/speedMultiplier), @(2.5/speedMultiplier), @(1.7/speedMultiplier), @(3.1/speedMultiplier)];
    NSArray *values = @[@0, @0.7, @0.4, @0.05, @0.95, @0.3, @0.9, @0.4, @0.15, @0.18, @0.75, @0.01];

    // Draw lines
    for (int i = 0; i < 4; i++) {
        CAKeyframeAnimation *animation = [CAKeyframeAnimation animationWithKeyPath:@"path"];
        animation.additive = YES;
        
        NSMutableArray *animationValues = [NSMutableArray array];
        for (NSNumber *value in values) {
            CGFloat heightFactor = [value doubleValue];
            CGFloat height = size.height * heightFactor;
            CGPoint point = CGPointMake(0, size.height - height);
            UIBezierPath *path = [UIBezierPath bezierPathWithRect:CGRectMake(point.x, point.y, lineSize, height)];
            [animationValues addObject:(__bridge id)path.CGPath];
        }
        
        animation.values = animationValues;
        animation.duration = [durations[i] doubleValue];
        animation.repeatCount = HUGE_VALF;
        animation.removedOnCompletion = NO;

        CALayer *line = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeLine size:CGSizeMake(lineSize, size.height) color:color];
        CGRect frame = CGRectMake(x + lineSize * 2 * i,
                                 y,
                                 lineSize,
                                 size.height);

        line.frame = frame;
        [line addAnimation:animation forKey:@"animation"];
        [layer addSublayer:line];
    }
}

@end
